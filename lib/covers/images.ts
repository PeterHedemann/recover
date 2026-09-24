import sharp from "sharp";
import { AppError } from "./errors";
import {
  MAX_IMAGE_PIXELS,
  MAX_UPLOAD_BYTES,
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH,
} from "./limits";

const mimeTypes: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function validateImage(data: Buffer) {
  if (!data.length || data.length > MAX_UPLOAD_BYTES)
    throw new AppError(413, "Choose an image smaller than 4 MB.");
  try {
    const image = sharp(data, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "warning",
    });
    const meta = await image.metadata();
    if (
      !meta.format ||
      !mimeTypes[meta.format] ||
      !meta.width ||
      !meta.height ||
      (meta.pages ?? 1) > 1
    ) {
      throw new AppError(
        400,
        "Choose a single-frame JPEG, PNG, or WebP image.",
      );
    }
    // Force decoding, including truncated/corrupt images, before persisting the original.
    const { data: thumbnail, info } = await image
      .rotate()
      .resize(240, 324, { fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return {
      mimeType: mimeTypes[meta.format],
      width: meta.width,
      height: meta.height,
      thumbnail,
      thumbnailWidth: info.width,
      thumbnailHeight: info.height,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      400,
      "This image could not be read. Use a valid JPEG, PNG, or WebP of at most 20 megapixels.",
    );
  }
}

export async function prepareCover(original: Buffer) {
  const { data, info } = await sharp(original, {
    limitInputPixels: MAX_IMAGE_PIXELS,
  })
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const left = Math.floor((OUTPUT_WIDTH - info.width) / 2);
  const top = Math.floor((OUTPUT_HEIGHT - info.height) / 2);
  // API dimensions are multiples of 16; four extra rows at each edge are removed on export.
  const canvas = await sharp({
    create: {
      width: OUTPUT_WIDTH,
      height: 1456,
      channels: 3,
      background: "#e8e5df",
    },
  })
    .composite([{ input: data, left, top: top + 4 }])
    .png()
    .toBuffer();
  return {
    original: data,
    canvas,
    left,
    top,
    width: info.width,
    height: info.height,
  };
}

export async function finishCover(
  generated: Buffer,
  cover: Awaited<ReturnType<typeof prepareCover>>,
) {
  const background = await sharp(generated, {
    limitInputPixels: MAX_IMAGE_PIXELS,
  })
    .resize(OUTPUT_WIDTH, 1456, { fit: "cover" })
    .toBuffer();
  const cropped = await sharp(background)
    .extract({ left: 0, top: 4, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT })
    .toBuffer();
  // Reapply source pixels: a model must never rewrite the book's lettering or central artwork.
  for (const quality of [92, 85, 75]) {
    const data = await sharp(cropped)
      .composite([{ input: cover.original, left: cover.left, top: cover.top }])
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (data.length <= MAX_UPLOAD_BYTES) return data;
  }
  throw new AppError(
    502,
    "The generated image is too large to save. Please retry.",
  );
}
