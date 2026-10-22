import { randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
const backend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(backend, ".env");
let source = await readFile(envPath, "utf8");
const config = dotenv.parse(source);
if (!config.DATABASE_URL)
  throw new Error("请先配置后端 .env 中的 DATABASE_URL");
const directory = join(homedir(), ".local", "state", "country");
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
const backup = join(directory, `backend-env-before-access-${Date.now()}`);
await copyFile(envPath, backup);
await chmod(backup, 0o600);
const db = new PrismaClient({
  datasources: { db: { url: config.DATABASE_URL } },
});
try {
  const [merchants, riders] = await Promise.all([
    db.merchant.findMany(),
    db.rider.findMany(),
  ]);
  const admin = config.ADMIN_ACCESS_KEY || randomBytes(32).toString("hex");
  const staff = JSON.parse(config.STAFF_ACCESS_KEYS || "{}");
  for (const merchant of merchants)
    staff[`MERCHANT:${merchant.id}`] ||= randomBytes(32).toString("hex");
  for (const rider of riders)
    staff[`RIDER:${rider.id}`] ||= randomBytes(32).toString("hex");
  function set(name, value) {
    const line = `${name}=${value}`;
    const regex = new RegExp(`^${name}=.*$`, "m");
    source = regex.test(source)
      ? source.replace(regex, line)
      : source.replace(/\s*$/, "") + "\n" + line + "\n";
  }
  set("ADMIN_ACCESS_KEY", admin);
  set("STAFF_ACCESS_KEYS", JSON.stringify(staff));
  if (!Object.hasOwn(config, "MOCK_PAYMENT_ENABLED"))
    set("MOCK_PAYMENT_ENABLED", "true");
  const records = [
    "乡镇外卖工作人员访问凭证（仅保存在服务器，勿提交Git或发送到聊天）",
    `运营后台 ADMIN:admin-dev\n${admin}`,
  ];
  for (const merchant of merchants)
    records.push(
      `商家 ${merchant.name}\n身份ID：${merchant.id}\n${staff[`MERCHANT:${merchant.id}`]}`,
    );
  for (const rider of riders)
    records.push(
      `骑手 ${rider.name}\n身份ID：${rider.id}\n${staff[`RIDER:${rider.id}`]}`,
    );
  await writeFile(
    join(directory, "staff-access.txt"),
    records.join("\n\n") + "\n",
    { mode: 0o600 },
  );
  await chmod(join(directory, "staff-access.txt"), 0o600);
  await writeFile(envPath, source, { mode: 0o600 });
  await chmod(envPath, 0o600);
  console.log(
    `访问凭证已配置。请本人查看：${join(directory, "staff-access.txt")}`,
  );
  console.log("已保留原有凭证；新增商家或骑手后可再次运行。测试支付不会扣款。");
} finally {
  await db.$disconnect();
}
