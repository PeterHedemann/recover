"use server";

import { signIn } from "@/lib/users";
import { redirect } from "next/navigation";
import { FormState } from "../utils";
import * as z from "zod";

const SignInSchema = z.object({
  email: z.email(),
  password: z
    .string("Password is required")
    .min(8, "Password is at least 8 characters"),
});

export type SignInFormData = z.infer<typeof SignInSchema>;

export async function SignInAction(
  prevState: FormState<SignInFormData>,
  formData: FormData,
): Promise<FormState<SignInFormData>> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const data = { email, password };

  const parsedData = SignInSchema.safeParse(data);

  if (!parsedData.success) {
    const errors = z.flattenError(parsedData.error);
    return { status: "error", data, errors };
  }
  const result = await signIn(email, password);

  if (result.success) {
    redirect("/");
  }

  return { status: "error", data, errors: { formErrors: [result.message] } };
}
