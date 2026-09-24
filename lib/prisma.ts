import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const connectionUrl = new URL(databaseUrl);

if (connectionUrl.protocol !== "mysql:") {
  throw new Error("DATABASE_URL must use the mysql protocol");
}

const adapter = new PrismaMariaDb({
  host: connectionUrl.hostname,
  port: connectionUrl.port ? Number(connectionUrl.port) : 3306,
  user: decodeURIComponent(connectionUrl.username),
  password: decodeURIComponent(connectionUrl.password),
  database: connectionUrl.pathname.replace(/^\//, ""),
  connectionLimit: 2,
  connectTimeout: 10_000,
  acquireTimeout: 10_000,
  ...(process.env.DATABASE_SSL === "true"
    ? {
        ssl: {
          rejectUnauthorized: true,
          ...(process.env.DATABASE_SSL_CA
            ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n") }
            : {}),
        },
      }
    : {}),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
