import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/users";
import { getUpload } from "@/lib/covers/store";
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
  return (
    <>
      <SiteHeader name={user.name} />
      <CoverDetail
        initial={{
          ...cover,
          createdAt: cover.createdAt.toISOString(),
          finishedAt: cover.finishedAt?.toISOString() || null,
        }}
      />
    </>
  );
}
