import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { apiUser, apiError, json } from "@/lib/covers/http";
import { AppError } from "@/lib/covers/errors";
import { claimUpload, getUpload, userTransaction } from "@/lib/covers/store";
import {
  identifyBook,
  openaiClient,
  processingError,
  transformCover,
} from "@/lib/covers/openai";
import {
  OUTPUT_WIDTH,
  OUTPUT_HEIGHT,
  PROCESS_TIMEOUT_MS,
} from "@/lib/covers/limits";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await apiUser(request, true);
    const { id } = await params;
    const client = openaiClient();
    const claim = await claimUpload(user.id, id);
    if (claim.finished) return json(claim.upload);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROCESS_TIMEOUT_MS);
    const ownership = {
      id,
      userId: user.id,
      status: "processing" as const,
      processingToken: claim.token,
    };
    try {
      const original = await prisma.uploadImage.findUnique({
        where: { uploadId_kind: { uploadId: id, kind: "original" } },
      });
      if (!original) throw new AppError(404, "Original image not found.");
      const output = await prisma.upload.findFirst({
        where: { id, userId: user.id },
        select: { outputWidth: true, outputHeight: true },
      });
      const outputWidth = output?.outputWidth ?? OUTPUT_WIDTH;
      const outputHeight = output?.outputHeight ?? OUTPUT_HEIGHT;
      const bytes = Buffer.from(original.data);
      const bookPromise = identifyBook(client, bytes, original.mimeType, controller.signal);
      const [book, image] = await Promise.all([
        bookPromise,
        transformCover(client, bytes, controller.signal, async (stage) => {
          const updated = await prisma.upload.updateMany({
            where: ownership,
            data: { stage },
          });
          if (!updated.count)
            throw new AppError(409, "This processing attempt has expired.");
        }, outputWidth, outputHeight, bookPromise),
      ]);
      const { data: thumbnail, info } = await sharp(image)
        .resize(240, 324)
        .jpeg({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      await userTransaction(user.id, async (tx) => {
        const updated = await tx.upload.updateMany({
          where: ownership,
          data: {
            ...book,
            status: "finished",
            stage: null,
            finishedAt: new Date(),
            error: null,
            processingToken: null,
            leaseExpiresAt: null,
          },
        });
        if (!updated.count)
          throw new AppError(409, "This processing attempt has expired.");
        const result = {
          mimeType: "image/jpeg",
          width: outputWidth,
          height: outputHeight,
          byteSize: image.length,
          data: new Uint8Array(image),
        };
        await tx.uploadImage.upsert({
          where: { uploadId_kind: { uploadId: id, kind: "result" } },
          create: { uploadId: id, kind: "result", ...result },
          update: result,
        });
        await tx.uploadImage.update({
          where: { uploadId_kind: { uploadId: id, kind: "thumbnail" } },
          data: {
            width: info.width,
            height: info.height,
            byteSize: thumbnail.length,
            data: new Uint8Array(thumbnail),
          },
        });
      });
      return json(await getUpload(user.id, id));
    } catch (error) {
      controller.abort();
      const message = processingError(error);
      await prisma.upload.updateMany({
        where: ownership,
        data: {
          status: "failed",
          error: message,
          stage: null,
          processingToken: null,
          leaseExpiresAt: null,
        },
      });
      return json(
        { error: message, id },
        error instanceof AppError ? error.status : 502,
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return apiError(error);
  }
}
