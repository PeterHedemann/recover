import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { validateImage, prepareCover, finishCover } from "../lib/covers/images";

async function fixture(width = 600, height = 900) {
  return sharp({
    create: { width, height, channels: 3, background: "#c52626" },
  })
    .png()
    .toBuffer();
}

test("validates actual content and generates a small thumbnail", async () => {
  const result = await validateImage(await fixture());
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.width, 600);
  assert.equal(result.height, 900);
  assert.ok(result.thumbnailWidth <= 240);
  assert.ok(result.thumbnailHeight <= 324);
});

test("rejects malformed, oversized, unsupported and excessive-pixel inputs", async () => {
  await assert.rejects(validateImage(Buffer.from("not an image")));
  await assert.rejects(validateImage(Buffer.alloc(4_000_001)));
  await assert.rejects(
    validateImage(Buffer.from('<svg width="100" height="100"></svg>')),
  );
  await assert.rejects(validateImage(await fixture(5000, 4100)));
});

test("exports the generated cover artwork at exact dimensions", async () => {
  const generated = await sharp({
    create: { width: 1072, height: 1456, channels: 3, background: "#1648c9" },
  })
    .png()
    .toBuffer();
  const result = await finishCover(generated);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 1072);
  assert.equal(metadata.height, 1448);
  assert.equal(metadata.format, "jpeg");
  assert.ok(result.length < 4_000_000);
  const middle = await sharp(result)
    .extract({ left: 530, top: 720, width: 1, height: 1 })
    .raw()
    .toBuffer();
  assert.ok(
    middle[2] > 150 && middle[0] < 80,
    "generated cover artwork is retained in the center",
  );
  const edge = await sharp(result)
    .extract({ left: 2, top: 720, width: 1, height: 1 })
    .raw()
    .toBuffer();
  assert.ok(
    edge[2] > 150 && edge[0] < 80,
    "generated artwork remains at the edge",
  );
});

test("normalizes EXIF orientation and preserves landscape cover proportions", async () => {
  const original = await sharp(await fixture(900, 600))
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const prepared = await prepareCover(original);
  assert.ok(prepared.height > prepared.width);
  const landscape = await prepareCover(await fixture(900, 600));
  assert.equal(landscape.width, 1072);
  assert.ok(Math.abs(landscape.width / landscape.height - 1.5) < 0.01);
  assert.ok(landscape.top > 0);
});
