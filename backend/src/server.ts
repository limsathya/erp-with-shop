import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 ERP API running at ${env.PUBLIC_URL} (port ${env.PORT})`);
  console.log(`   CORS allowed for: ${env.CLIENT_URL}`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down...`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    redis.disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
