import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/users";
import { getUpload } from "@/lib/covers/store";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/covers/errors";
import { SiteHeader } from "@/components/site-header";
import { CoverDetail } from "@/components/cover-detail";

export default async function CoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const { id } = await params;
  const cover = await getUpload(user.id, id).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  const imageFormats = await prisma.uploadImage.findMany({
    where: { uploadId: id, upload: { userId: user.id }, kind: { in: ["original", "result"] } },
    select: { kind: true, mimeType: true },
  });
  const extensionFor = (mimeType: string | undefined) =>
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const mimeByKind = Object.fromEntries(imageFormats.map(({ kind, mimeType }) => [kind, mimeType]));
  const downloadExtensions = {
    original: extensionFor(mimeByKind.original),
    result: extensionFor(mimeByKind.result),
  };
  return (
    <>
      <SiteHeader name={user.name} />
      <CoverDetail
        downloadExtensions={downloadExtensions}
        initial={{
          ...cover,
          createdAt: cover.createdAt.toISOString(),
          finishedAt: cover.finishedAt?.toISOString() || null,
        }}
      />
    </>
  );
}
