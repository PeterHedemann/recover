import { z } from "zod";
import { apiUser, apiError, json, readBody } from "@/lib/covers/http";
import { AppError } from "@/lib/covers/errors";
import {
  getUpload,
  uploadSelect,
  userTransaction,
  expireProcessing,
} from "@/lib/covers/store";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function GET(request: Request, { params }: Context) {
  try {
    return json(
      await getUpload((await apiUser(request)).id, (await params).id),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await apiUser(request, true);
    const { id } = await params;
    let body: unknown;
    try {
      body = JSON.parse((await readBody(request, 10_000)).toString());
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(400, "Invalid book details.");
    }
    const parsed = z
      .object({
        title: z.string().trim().max(500),
        author: z.string().trim().max(500),
      })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      throw new AppError(
        400,
        "Title and author must each be at most 500 characters.",
      );
    const upload = await userTransaction(user.id, async (tx) => {
      const entry = await tx.upload.findFirst({
        where: { id, userId: user.id },
      });
      if (!entry) throw new AppError(404, "Cover not found.");
      if (entry.status !== "finished")
        throw new AppError(
          409,
          "Wait until processing finishes before editing details.",
        );
      return tx.upload.update({
        where: { id },
        data: {
          title: parsed.data.title || null,
          author: parsed.data.author || null,
          metadataWarning: null,
        },
        select: uploadSelect,
      });
    });
    return json(upload);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const user = await apiUser(request, true);
    const { id } = await params;
    await expireProcessing(user.id);
    await userTransaction(user.id, async (tx) => {
      const entry = await tx.upload.findFirst({
        where: { id, userId: user.id },
      });
      if (!entry) throw new AppError(404, "Cover not found.");
      if (entry.status === "processing")
        throw new AppError(
          409,
          "Wait until processing finishes before deleting this cover.",
        );
      await tx.upload.delete({ where: { id } });
    });
    return json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
