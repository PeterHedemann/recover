import "server-only";
import { auth } from "@/lib/auth";
import { AppError } from "./errors";

export async function apiUser(request: Request, mutation = false) {
  if (mutation) {
    const origin = request.headers.get("origin");
    const allowed = new Set([new URL(request.url).origin]);
    if (process.env.BETTER_AUTH_URL)
      allowed.add(new URL(process.env.BETTER_AUTH_URL).origin);
    if (!origin || !allowed.has(origin))
      throw new AppError(403, "Invalid request origin.");
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new AppError(401, "Please sign in to continue.");
  return session.user;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function apiError(error: unknown) {
  if (error instanceof AppError)
    return json({ error: error.message }, error.status);
  // Never log request bodies, image bytes, database URLs, or provider error payloads.
  console.error(
    "Cover request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json({ error: "Something went wrong. Please try again." }, 500);
}

export async function readBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new AppError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new AppError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
