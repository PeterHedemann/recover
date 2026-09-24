import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test, expect, type APIRequestContext } from "@playwright/test";
import sharp from "sharp";

const origin = "http://localhost:3011";
async function register(request: APIRequestContext) {
  const result = await request.post("/api/auth/sign-up/email", {
    headers: { origin },
    data: {
      name: "Cover Reader",
      email: `cover-${crypto.randomUUID()}@example.com`,
      password: "Test-password-123!",
    },
  });
  expect(result.ok()).toBeTruthy();
  return (await result.json()).user.id as string;
}
async function image() {
  return sharp({
    create: { width: 600, height: 900, channels: 3, background: "#344e41" },
  })
    .png()
    .toBuffer();
}
async function upload(request: APIRequestContext, id = crypto.randomUUID()) {
  const result = await request.post("/api/uploads", {
    headers: { origin },
    multipart: {
      id,
      image: {
        name: "garden.png",
        mimeType: "image/png",
        buffer: await image(),
      },
    },
  });
  expect(result.status()).toBe(201);
  return await result.json();
}

test("sign up, upload, process, correct details, download, and delete", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Name", { exact: true }).fill("Cover Reader");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`reader-${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("Test-password-123!");
  await page
    .getByLabel("Repeat password", { exact: true })
    .fill("Test-password-123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Good covers. Perfect fit." }),
  ).toBeVisible();
  await page.getByLabel("Choose a book cover").setInputFiles({
    name: "garden.png",
    mimeType: "image/png",
    buffer: await image(),
  });
  await page
    .getByRole("button", { name: "Process cover", exact: true })
    .click();
  await expect(page).toHaveURL(/\/uploads\//, { timeout: 60000 });
  await expect(
    page.getByRole("heading", { name: "The Secret Garden" }),
  ).toBeVisible();
  const id = page.url().split("/").pop();
  const result = await page.request.get(`/api/uploads/${id}/image/result`);
  expect(result.status()).toBe(200);
  const meta = await sharp(await result.body()).metadata();
  expect([meta.width, meta.height]).toEqual([1072, 1448]);
  await page.getByLabel("Title", { exact: true }).fill("My corrected title");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Book details saved.")).toBeVisible();
  await page.screenshot({
    path: "test-results/cover-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/cover-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Delete cover", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete cover" })
    .click();
  await expect(page).toHaveURL(origin + "/");
  expect(
    (await page.request.get(`/api/uploads/${id}/image/original`)).status(),
  ).toBe(404);
});

test("ownership, origin checks, idempotent uploads and concurrent processing", async ({
  request,
  playwright,
}) => {
  await register(request);
  expect(
    (
      await request.post("/api/uploads", {
        headers: { origin: "https://attacker.example" },
      })
    ).status(),
  ).toBe(403);
  const cover = await upload(request);
  const repeat = await upload(request, cover.id);
  expect(repeat.id).toBe(cover.id);
  expect((await (await request.get("/api/uploads")).json()).total).toBe(1);
  const other = await playwright.request.newContext({ baseURL: origin });
  expect((await other.get(`/api/uploads/${cover.id}`)).status()).toBe(401);
  await register(other);
  for (const suffix of [
    "",
    "/image/original",
    "/image/thumbnail",
    "/image/result",
  ])
    expect(
      (await other.get(`/api/uploads/${cover.id}${suffix}`)).status(),
    ).toBe(404);
  expect(
    (
      await other.post(`/api/uploads/${cover.id}/process`, {
        headers: { origin },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await other.patch(`/api/uploads/${cover.id}`, {
        headers: { origin },
        data: { title: "Not mine", author: "" },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await other.delete(`/api/uploads/${cover.id}`, { headers: { origin } })
    ).status(),
  ).toBe(404);
  const second = await upload(request);
  const results = await Promise.all(
    [cover.id, second.id].map((id) =>
      request.post(`/api/uploads/${id}/process`, { headers: { origin } }),
    ),
  );
  expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
  const finishedId = results[0].status() === 200 ? cover.id : second.id;
  expect(
    (
      await request.post(`/api/uploads/${finishedId}/process`, {
        headers: { origin },
      })
    ).status(),
  ).toBe(200);
  expect(
    (await (await request.get(`/api/uploads/${finishedId}`)).json())
      .attemptCount,
  ).toBe(1);
  await other.dispose();
});

test("server rejects spoofed images and enforces daily processing quota", async ({
  request,
}) => {
  await register(request);
  const invalid = await request.post("/api/uploads", {
    headers: { origin },
    multipart: {
      id: crypto.randomUUID(),
      image: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from("not an image"),
      },
    },
  });
  expect(invalid.status()).toBe(400);
  for (let i = 0; i < 4; i++) {
    const cover = await upload(request);
    const response = await request.post(`/api/uploads/${cover.id}/process`, {
      headers: { origin },
    });
    expect(response.status()).toBe(i < 3 ? 200 : 429);
    expect(
      (
        await request.delete(`/api/uploads/${cover.id}`, {
          headers: { origin },
        })
      ).status(),
    ).toBe(200);
  }
});

test("a failed image can be retried, and unavailable metadata does not lose the result", async ({
  request,
}) => {
  await register(request);
  const cover = await upload(request);
  await request.post("http://127.0.0.1:4011/control", {
    data: { failImages: 1 },
  });
  expect(
    (
      await request.post(`/api/uploads/${cover.id}/process`, {
        headers: { origin },
      })
    ).status(),
  ).toBe(502);
  const failed = await (await request.get(`/api/uploads/${cover.id}`)).json();
  expect(failed.status).toBe("failed");
  expect(failed.error).toContain("OpenAI");
  await request.post("http://127.0.0.1:4011/control", {
    data: { failMetadata: 1 },
  });
  const retried = await request.post(`/api/uploads/${cover.id}/process`, {
    headers: { origin },
  });
  expect(retried.status()).toBe(200);
  const result = await retried.json();
  expect(result.status).toBe("finished");
  expect(result.title).toBeNull();
  expect(result.metadataWarning).toBeTruthy();
  expect(result.attemptCount).toBe(2);
  expect(
    (await request.get(`/api/uploads/${cover.id}/image/result`)).status(),
  ).toBe(200);
});

test("expired processing is recoverable and deletion removes every stored image", async ({
  request,
}) => {
  const fixture = async (operation: string, id: string) => {
    const result = await promisify(execFile)(process.execPath, [
      "--import",
      "tsx",
      "tests/database-fixture.mjs",
      operation,
      id,
    ]);
    return Number(result.stdout.trim());
  };
  await register(request);
  const cover = await upload(request);
  await fixture("expire", cover.id);
  const stale = await (await request.get(`/api/uploads/${cover.id}`)).json();
  expect(stale.status).toBe("failed");
  expect(stale.error).toContain("interrupted");
  expect(
    (
      await request.post(`/api/uploads/${cover.id}/process`, {
        headers: { origin },
      })
    ).status(),
  ).toBe(200);
  expect(await fixture("count", cover.id)).toBe(3);
  expect(
    (
      await request.delete(`/api/uploads/${cover.id}`, { headers: { origin } })
    ).status(),
  ).toBe(200);
  expect(await fixture("count", cover.id)).toBe(0);
});
