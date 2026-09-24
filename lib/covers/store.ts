import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "./errors";
import { positiveLimit, PROCESS_LEASE_MS } from "./limits";

export const uploadSelect = {
  id: true,
  filename: true,
  status: true,
  stage: true,
  title: true,
  author: true,
  error: true,
  metadataWarning: true,
  createdAt: true,
  finishedAt: true,
  attemptCount: true,
} satisfies Prisma.UploadSelect;

export const savedLimit = () =>
  positiveLimit(process.env.MAX_SAVED_UPLOADS, 50);
export const dailyLimit = () =>
  positiveLimit(process.env.DAILY_PROCESSING_LIMIT, 10);

// Serialize per-user mutations across Vercel instances, not just within one Node process.
export async function userTransaction<T>(
  userId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM user WHERE id = ${userId} FOR UPDATE`;
      return work(tx);
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}

export async function expireProcessing(userId: string) {
  await prisma.upload.updateMany({
    where: { userId, status: "processing", leaseExpiresAt: { lt: new Date() } },
    data: {
      status: "failed",
      stage: null,
      processingToken: null,
      leaseExpiresAt: null,
      error:
        "Processing was interrupted or timed out. You can retry this cover.",
    },
  });
}

export async function listUploads(userId: string, page = 1) {
  await expireProcessing(userId);
  const [items, total] = await Promise.all([
    prisma.upload.findMany({
      where: { userId },
      select: uploadSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12,
      skip: (page - 1) * 12,
    }),
    prisma.upload.count({ where: { userId } }),
  ]);
  return {
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 12)),
    limit: savedLimit(),
  };
}

export async function getUpload(userId: string, id: string) {
  await expireProcessing(userId);
  const upload = await prisma.upload.findFirst({
    where: { id, userId },
    select: uploadSelect,
  });
  if (!upload) throw new AppError(404, "Cover not found.");
  return upload;
}

export async function claimUpload(userId: string, id: string) {
  return userTransaction(userId, async (tx) => {
    await tx.upload.updateMany({
      where: {
        userId,
        status: "processing",
        leaseExpiresAt: { lt: new Date() },
      },
      data: {
        status: "failed",
        processingToken: null,
        leaseExpiresAt: null,
        stage: null,
        error: "Processing timed out. Please retry.",
      },
    });
    const upload = await tx.upload.findFirst({
      where: { id, userId },
      select: uploadSelect,
    });
    if (!upload) throw new AppError(404, "Cover not found.");
    if (upload.status === "finished")
      return { finished: true as const, upload };
    if (await tx.upload.count({ where: { userId, status: "processing" } }))
      throw new AppError(
        409,
        "A cover is already processing. Wait for it to finish before starting another.",
      );
    const day = new Date().toISOString().slice(0, 10);
    const usage = await tx.dailyUsage.findUnique({
      where: { userId_day: { userId, day } },
    });
    if ((usage?.attempts ?? 0) >= dailyLimit())
      throw new AppError(
        429,
        `You've reached today's ${dailyLimit()} processing attempts. Try again tomorrow (UTC).`,
      );
    const token = crypto.randomUUID();
    await tx.dailyUsage.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, attempts: 1 },
      update: { attempts: { increment: 1 } },
    });
    await tx.upload.update({
      where: { id },
      data: {
        status: "processing",
        stage: "preparing",
        error: null,
        metadataWarning: null,
        processingToken: token,
        leaseExpiresAt: new Date(Date.now() + PROCESS_LEASE_MS),
        attemptCount: { increment: 1 },
      },
    });
    return { finished: false as const, token };
  });
}
