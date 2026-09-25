import "server-only";
import { prisma } from "@/lib/prisma";
import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from "./limits";

export const defaultResolution = {
  name: `${OUTPUT_WIDTH} × ${OUTPUT_HEIGHT} px`,
  width: OUTPUT_WIDTH,
  height: OUTPUT_HEIGHT,
};

export async function listResolutions(userId: string) {
  // Lazily seed accounts created before or after this feature.
  if (!(await prisma.outputResolution.count({ where: { userId } }))) {
    await prisma.outputResolution.createMany({
      data: [{ userId, ...defaultResolution }],
      skipDuplicates: true,
    });
  }
  const resolutions = await prisma.outputResolution.findMany({
    where: { userId },
    orderBy: [{ width: "asc" }, { height: "asc" }],
    select: { id: true, name: true, width: true, height: true },
  });
  return resolutions.sort((a, b) =>
    Number(b.width === OUTPUT_WIDTH && b.height === OUTPUT_HEIGHT) -
    Number(a.width === OUTPUT_WIDTH && a.height === OUTPUT_HEIGHT),
  );
}
