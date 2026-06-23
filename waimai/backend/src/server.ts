import { env } from "./config/env.js";
import { prisma } from "./config/db.js";
import { createApp } from "./app.js";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`waimai backend listening on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
