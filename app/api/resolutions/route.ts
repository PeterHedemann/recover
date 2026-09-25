import { z } from "zod";
import { apiUser, apiError, json, readBody } from "@/lib/covers/http";
import { AppError } from "@/lib/covers/errors";
import { prisma } from "@/lib/prisma";
import { listResolutions } from "@/lib/covers/resolutions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await apiUser(request);
    return json(await listResolutions(user.id));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await apiUser(request, true);
    const body = await readBody(request, 2048);
    let input: unknown;
    try { input = JSON.parse(body.toString("utf8")); } catch {
      throw new AppError(400, "Enter a valid resolution.");
    }
    const parsed = z.object({
      name: z.string().trim().min(1).max(80),
      width: z.number().int().min(256).max(4096),
      height: z.number().int().min(256).max(4096),
    }).safeParse(input);
    if (!parsed.success) throw new AppError(400, "Enter a name and whole-number dimensions between 256 and 4096 pixels.");
    const { name, width, height } = parsed.data;
    const resolution = await prisma.outputResolution.upsert({
      where: { userId_width_height: { userId: user.id, width, height } },
      create: { userId: user.id, width, height, name },
      update: { name },
      select: { id: true, name: true, width: true, height: true },
    });
    return json(resolution, 201);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await apiUser(request, true);
    const parsed = z.object({ id: z.string().min(1) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AppError(400, "Choose a resolution to remove.");
    const resolution = await prisma.outputResolution.findFirst({
      where: { id: parsed.data.id, userId: user.id },
      select: { id: true, width: true, height: true },
    });
    if (!resolution) throw new AppError(404, "Resolution not found.");
    const count = await prisma.outputResolution.count({ where: { userId: user.id } });
    if (count <= 1) throw new AppError(409, "Keep at least one output resolution.");
    await prisma.outputResolution.delete({ where: { id: resolution.id } });
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
