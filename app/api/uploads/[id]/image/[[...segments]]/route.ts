import { prisma } from "@/lib/prisma";
import { apiUser, apiError } from "@/lib/covers/http";
import { AppError } from "@/lib/covers/errors";
import { bookFilenameBase } from "@/lib/covers/filename";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; segments?: string[] }> },
) {
  try {
    const user = await apiUser(request);
    const { id, segments = [] } = await params;
    const [kind] = segments;
    if (
      segments.length < 1 ||
      segments.length > 2 ||
      (kind !== "original" && kind !== "result" && kind !== "thumbnail")
    )
      throw new AppError(404, "Image not found.");
    const image = await prisma.uploadImage.findFirst({
      where: { uploadId: id, kind, upload: { userId: user.id } },
      include: { upload: { select: { title: true, author: true } } },
    });
    if (!image) throw new AppError(404, "Image not found.");
    const extension =
      image.mimeType === "image/jpeg"
        ? "jpg"
        : image.mimeType === "image/png"
          ? "png"
          : "webp";
    const download = new URL(request.url).searchParams.has("download");
    const baseName = bookFilenameBase(image.upload.title, image.upload.author, `cover-${id}`);
    return new Response(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(image.byteSize),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${baseName}.${extension}"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
