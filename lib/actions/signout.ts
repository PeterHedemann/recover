"use server";

import { signOut } from "@/lib/users";
import { redirect } from "next/navigation";

export async function SignOutAction() {
  await signOut();
  redirect("/signedout");
}
