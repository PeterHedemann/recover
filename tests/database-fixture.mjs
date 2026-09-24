import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const url = new URL(
  process.env.TEST_DATABASE_URL ||
    "mysql://myuser:mypass@127.0.0.1:3306/app_test",
);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw new Error("Only local test databases are allowed.");
const db = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 1,
  }),
});
try {
  const [operation, id] = process.argv.slice(2);
  if (operation === "expire") {
    await db.upload.update({
      where: { id },
      data: {
        status: "processing",
        processingToken: crypto.randomUUID(),
        leaseExpiresAt: new Date(Date.now() - 1000),
      },
    });
  } else if (operation === "count") {
    console.log(await db.uploadImage.count({ where: { uploadId: id } }));
  } else throw new Error("Unknown test operation");
} finally {
  await db.$disconnect();
}
