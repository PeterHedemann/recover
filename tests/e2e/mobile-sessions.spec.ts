import { test, expect } from "@playwright/test";

test("native bearer sessions support reads, writes, and revocation without cookies", async ({
  request,
  playwright,
}) => {
  const email = `mobile-${crypto.randomUUID()}@example.com`;
  const password = "Test-password-123!";
  const signup = await request.post("/api/auth/sign-up/email", {
    data: { name: "Mobile Reader", email, password },
  });
  expect(signup.status()).toBe(200);
  expect(signup.headers()["set-auth-token"]).toBeTruthy();
  const userId = (await signup.json()).user.id;

  const login = await playwright.request.newContext({ baseURL: "http://localhost:3011" });
  const signin = await login.post("/api/auth/sign-in/email", {
    data: { email, password },
  });
  expect(signin.status()).toBe(200);
  const token = signin.headers()["set-auth-token"];
  expect(token).toBeTruthy();
  await login.dispose();

  // Node fetch has no cookie jar, matching a native bearer-only client.
  const native = {
    get: (path: string) => fetch(`http://localhost:3011${path}`, {
      headers: { authorization: `Bearer ${token}` },
    }),
    post: (path: string, options: { headers?: Record<string, string>; data?: unknown } = {}) =>
      fetch(`http://localhost:3011${path}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          ...(options.data === undefined ? {} : { "content-type": "application/json" }),
          ...options.headers,
        },
        body: options.data === undefined ? undefined : JSON.stringify(options.data),
      }),
  };
  const session = await native.get("/api/auth/get-session");
  expect(session.status).toBe(200);
  expect((await session.json()).user.id).toBe(userId);
  expect((await native.get("/api/uploads")).status).toBe(200);

  const resolution = await native.post("/api/resolutions", {
    data: { name: "Mobile device", width: 800, height: 1200 },
  });
  expect(resolution.status).toBe(201);

  // Cookie sessions retain CSRF protection, including with a bogus bearer.
  const payload = { name: "Blocked", width: 900, height: 1300 };
  expect((await request.post("/api/resolutions", {
    headers: { origin: "http://localhost:3011" },
    data: payload,
  })).status()).toBe(201);
  expect((await request.post("/api/resolutions", { data: payload })).status()).toBe(403);
  expect((await request.post("/api/resolutions", {
    headers: { authorization: "Bearer invalid-token" },
    data: payload,
  })).status()).toBe(401);
  expect((await request.get("/api/uploads", {
    headers: { authorization: "Bearer invalid-token" },
  })).status()).toBe(401);
  expect((await native.post("/api/resolutions", {
    headers: { origin: "https://attacker.example" },
    data: payload,
  })).status).toBe(403);

  expect((await native.post("/api/auth/sign-out", { data: {} })).status).toBe(200);
  expect(await (await native.get("/api/auth/get-session")).json()).toBeNull();
  expect((await native.get("/api/uploads")).status).toBe(401);
  expect((await native.post("/api/resolutions", { data: payload })).status).toBe(401);
});
