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

const IMAGE_DIMENSION_MULTIPLE = 16;
const roundUpToModelDimension = (value: number) =>
  Math.ceil(value / IMAGE_DIMENSION_MULTIPLE) * IMAGE_DIMENSION_MULTIPLE;

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

export async function prepareCover(original: Buffer, outputWidth = OUTPUT_WIDTH, outputHeight = OUTPUT_HEIGHT) {
  const canvasWidth = roundUpToModelDimension(outputWidth);
  const canvasHeight = roundUpToModelDimension(outputHeight);
  const cropLeft = Math.floor((canvasWidth - outputWidth) / 2);
  const cropTop = Math.floor((canvasHeight - outputHeight) / 2);
  const { data, info } = await sharp(original, {
    limitInputPixels: MAX_IMAGE_PIXELS,
  })
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize(outputWidth, outputHeight, { fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const left = cropLeft + Math.floor((outputWidth - info.width) / 2);
  const top = cropTop + Math.floor((outputHeight - info.height) / 2);
  const canvas = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: "#e8e5df",
    },
  })
    .composite([{ input: data, left, top }])
    .png()
    .toBuffer();
  return { canvas, left, top, width: info.width, height: info.height, outputWidth, outputHeight, canvasWidth, canvasHeight, cropLeft, cropTop };
}

export async function finishCover(generated: Buffer, outputWidth = OUTPUT_WIDTH, outputHeight = OUTPUT_HEIGHT) {
  const canvasWidth = roundUpToModelDimension(outputWidth);
  const canvasHeight = roundUpToModelDimension(outputHeight);
  const cropLeft = Math.floor((canvasWidth - outputWidth) / 2);
  const cropTop = Math.floor((canvasHeight - outputHeight) / 2);
  const background = await sharp(generated, {
    limitInputPixels: MAX_IMAGE_PIXELS,
  })
    .resize(canvasWidth, canvasHeight, { fit: "cover" })
    .toBuffer();
  const cropped = await sharp(background)
    .extract({ left: cropLeft, top: cropTop, width: outputWidth, height: outputHeight })
    .toBuffer();
  for (const quality of [92, 85, 75]) {
    const data = await sharp(cropped)
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (data.length <= MAX_UPLOAD_BYTES) return data;
  }
  throw new AppError(
    502,
    "The generated image is too large to save. Please retry.",
  );
}
