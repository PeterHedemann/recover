export const MAX_UPLOAD_BYTES = 4_000_000;
export const MAX_REQUEST_BYTES = 4_100_000;
export const MAX_IMAGE_PIXELS = 20_000_000;
export const OUTPUT_WIDTH = 1072;
export const OUTPUT_HEIGHT = 1448;
export const PROCESS_TIMEOUT_MS = 240_000;
export const PROCESS_LEASE_MS = 310_000;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function positiveLimit(value: string | undefined, fallback: number) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}
