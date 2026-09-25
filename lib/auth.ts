import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { passkey } from "@better-auth/passkey";
import { prisma } from "./prisma";

const authBaseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const authURL = new URL(authBaseURL);
const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(authURL.hostname);
const localOrigin = new URL(authBaseURL);
if (isLoopback) localOrigin.hostname = "localhost";

export const auth = betterAuth({
  baseURL: authBaseURL,
  trustedOrigins: isLoopback
    ? [authURL.origin, localOrigin.origin]
    : [authURL.origin],
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    nextCookies(),
    passkey({ rpID: isLoopback ? "localhost" : authURL.hostname }),
  ],
});
