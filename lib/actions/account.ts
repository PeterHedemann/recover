"use server";

import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/users";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { z } from "zod";

const nameSchema = z.string().trim().min(1, "Enter your name.").max(100, "Name must be 100 characters or fewer.");
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(128, "New password must be 128 characters or fewer."),
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export type AccountActionResult = { success: boolean; message: string };

export async function updateAccountName(formData: FormData): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Please sign in again." };

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Enter a valid name." };

  try {
    await auth.api.updateUser({ headers: await headers(), body: { name: parsed.data } });
    return { success: true, message: "Name updated." };
  } catch (error) {
    console.error("Could not update account name:", error);
    return { success: false, message: error instanceof APIError ? error.message : "Could not update your name. Try again." };
  }
}

export async function updateAccountPassword(formData: FormData): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Please sign in again." };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check the password fields." };

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    });
    return { success: true, message: "Password updated. Other sessions have been signed out." };
  } catch (error) {
    console.error("Could not update account password:", error);
    return { success: false, message: error instanceof APIError ? error.message : "Could not update your password. Check your current password and try again." };
  }
}
