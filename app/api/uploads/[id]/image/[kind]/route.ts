import { prisma } from "@/lib/prisma";
import { apiUser, apiError } from "@/lib/covers/http";
import { AppError } from "@/lib/covers/errors";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  try {
    const user = await apiUser(request);
    const { id, kind } = await params;
    if (kind !== "original" && kind !== "result" && kind !== "thumbnail")
      throw new AppError(404, "Image not found.");
    const image = await prisma.uploadImage.findFirst({
      where: { uploadId: id, kind, upload: { userId: user.id } },
    });
    if (!image) throw new AppError(404, "Image not found.");
    const extension =
      image.mimeType === "image/jpeg"
        ? "jpg"
        : image.mimeType === "image/png"
          ? "png"
          : "webp";
    const download = new URL(request.url).searchParams.has("download");
    return new Response(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(image.byteSize),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="cover-${id}.${extension}"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
