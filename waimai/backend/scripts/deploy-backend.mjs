import { spawnSync } from "node:child_process";
import {
  readFile,
  mkdir,
  copyFile,
  cp,
  chmod,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
const backend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = dotenv.parse(await readFile(join(backend, ".env"), "utf8"));
if (
  !config.DATABASE_URL ||
  !config.ADMIN_ACCESS_KEY ||
  !config.STAFF_ACCESS_KEYS
)
  throw new Error(
    "缺少数据库或访问凭证配置，请本人先运行 node scripts/configure-access.mjs",
  );
const service = process.argv[2] || "waimai-api";
if (!/^[a-zA-Z0-9_-]+$/.test(service)) throw new Error("PM2服务名称不正确");
const backup = join(
  homedir(),
  ".local",
  "state",
  "country",
  "backups",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
await mkdir(backup, { recursive: true, mode: 0o700 });
await chmod(backup, 0o700);
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: backend,
    stdio: "inherit",
    ...options,
  });
  if (result.error || result.status !== 0)
    throw new Error(`${command} 执行失败，请检查输出；备份目录：${backup}`);
}
const database = new URL(config.DATABASE_URL);
const pgEnv = {
  ...process.env,
  PGHOST: database.hostname,
  PGPORT: database.port || "5432",
  PGUSER: decodeURIComponent(database.username),
  PGPASSWORD: decodeURIComponent(database.password),
  PGDATABASE: database.pathname.slice(1),
  ...(database.searchParams.has("sslmode")
    ? { PGSSLMODE: database.searchParams.get("sslmode") }
    : {}),
};
await copyFile(join(backend, ".env"), join(backup, "backend.env"));
await chmod(join(backup, "backend.env"), 0o600);
await cp(join(backend, "dist"), join(backup, "dist"), { recursive: true });
const previous = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: backend,
  encoding: "utf8",
});
await writeFile(join(backup, "checkout-ref.txt"), previous.stdout || "", {
  mode: 0o600,
});
console.log("正在备份数据库，任何失败都会在迁移前停止。");
run("pg_dump", ["--format=custom", "--file", join(backup, "database.dump")], {
  env: pgEnv,
});
await chmod(join(backup, "database.dump"), 0o600);
console.log(`数据库、环境配置与原编译文件已备份：${backup}`);
run("npm", ["ci", "--include=dev"]);
run("npm", ["run", "prisma:generate"]);
run("npx", ["prisma", "migrate", "deploy"]);
run("npm", ["run", "build"]);
run("pm2", ["reload", service, "--update-env"], {
  env: { ...process.env, ...config },
});
let ready = false;
for (let attempt = 0; attempt < 15; attempt++) {
  try {
    const response = await fetch(
      `http://127.0.0.1:${config.PORT || 3000}/api/capabilities`,
      { signal: AbortSignal.timeout(2000) },
    );
    const body = await response.json();
    if (response.ok && body.data?.version === 2) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready)
  throw new Error(
    `新接口健康检查失败，请检查 pm2 logs ${service}；备份：${backup}`,
  );
run("pm2", ["save"]);
console.log("后端更新成功：独立账户、服务端报价、取消与超时关单接口已就绪。");
