import { z } from "zod";
import { apiUser, apiError, json, readBody } from "@/lib/covers/http";
import { AppError } from "@/lib/covers/errors";
import { MAX_REQUEST_BYTES } from "@/lib/covers/limits";
import { validateImage } from "@/lib/covers/images";
import {
  listUploads,
  savedLimit,
  uploadSelect,
  userTransaction,
} from "@/lib/covers/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await apiUser(request);
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .safeParse(new URL(request.url).searchParams.get("page") || "1");
    if (!page.success) throw new AppError(400, "Invalid page.");
    return json(await listUploads(user.id, page.data));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await apiUser(request, true);
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data"))
      throw new AppError(400, "Upload an image using multipart form data.");
    const body = await readBody(request, MAX_REQUEST_BYTES);
    let form: FormData;
    try {
      form = await new Response(new Uint8Array(body), {
        headers: { "Content-Type": contentType },
      }).formData();
    } catch {
      throw new AppError(400, "Invalid upload.");
    }
    const id = z.uuid().safeParse(form.get("id"));
    const file = form.get("image");
    if (
      !id.success ||
      !(file instanceof File) ||
      form.getAll("image").length !== 1
    )
      throw new AppError(400, "Choose one image to upload.");
    const data = Buffer.from(await file.arrayBuffer());
    const image = await validateImage(data);
    const upload = await userTransaction(user.id, async (tx) => {
      const existing = await tx.upload.findUnique({
        where: { id: id.data },
        select: { ...uploadSelect, userId: true },
      });
      if (existing) {
        if (existing.userId !== user.id)
          throw new AppError(409, "Upload ID is already in use.");
        const { userId: _, ...entry } = existing;
        void _;
        return entry;
      }
      if (
        (await tx.upload.count({ where: { userId: user.id } })) >= savedLimit()
      )
        throw new AppError(
          409,
          `Your library holds ${savedLimit()} covers. Delete one before uploading another.`,
        );
      return tx.upload.create({
        data: {
          id: id.data,
          userId: user.id,
          filename: file.name.slice(0, 255) || "cover",
          images: {
            create: [
              {
                kind: "original",
                mimeType: image.mimeType,
                width: image.width,
                height: image.height,
                byteSize: data.length,
                data: new Uint8Array(data),
              },
              {
                kind: "thumbnail",
                mimeType: "image/jpeg",
                width: image.thumbnailWidth,
                height: image.thumbnailHeight,
                byteSize: image.thumbnail.length,
                data: new Uint8Array(image.thumbnail),
              },
            ],
          },
        },
        select: uploadSelect,
      });
    });
    return json(upload, 201);
  } catch (error) {
    return apiError(error);
  }
}
