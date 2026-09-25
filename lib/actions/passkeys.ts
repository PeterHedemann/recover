"use server";

import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/users";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { z } from "zod";

const passkeyNameSchema = z.string().trim().min(1, "Enter a name.").max(100, "Name must be 100 characters or fewer.");

export type PasskeyActionResult = { success: boolean; message: string };

export async function updatePasskeyName(id: string, name: string): Promise<PasskeyActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Please sign in again." };
  const parsedId = z.string().min(1).safeParse(id);
  const parsedName = passkeyNameSchema.safeParse(name);
  if (!parsedId.success || !parsedName.success) return { success: false, message: "Enter a valid passkey name." };

  try {
    await auth.api.updatePasskey({ headers: await headers(), body: { id: parsedId.data, name: parsedName.data } });
    return { success: true, message: "Passkey renamed." };
  } catch (error) {
    console.error("Could not rename passkey:", error);
    return { success: false, message: error instanceof APIError ? error.message : "Could not rename this passkey. Try again." };
  }
}

export async function removePasskey(id: string): Promise<PasskeyActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Please sign in again." };
  const parsedId = z.string().min(1).safeParse(id);
  if (!parsedId.success) return { success: false, message: "Select a valid passkey." };

  try {
    await auth.api.deletePasskey({ headers: await headers(), body: { id: parsedId.data } });
    return { success: true, message: "Passkey removed." };
  } catch (error) {
    console.error("Could not remove passkey:", error);
    return { success: false, message: error instanceof APIError ? error.message : "Could not remove this passkey. Try again." };
  }
}
