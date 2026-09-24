"use server";

import { signUp } from "@/lib/users";
import { redirect } from "next/navigation";
import { FormState } from "../utils";
import * as z from "zod";

const SignUpSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.email("Email is required"),
    password: z
      .string("Password is required")
      .min(8, "Password should be at least 8 characters"),
    repeatPassword: z.string("Please repeat your chosen password"),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords don't match",
    path: ["repeatPassword"],
  });

export type SignUpFormData = z.infer<typeof SignUpSchema>;

export async function SignUpAction(
  prevState: FormState<SignUpFormData>,
  formData: FormData,
): Promise<FormState<SignUpFormData>> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const repeatPassword = formData.get("repeatPassword") as string;

  const data = { name, email, password, repeatPassword };
  const parsedData = SignUpSchema.safeParse(data);

  if (!parsedData.success) {
    const errors = z.flattenError(parsedData.error);
    return { status: "error", data, errors };
  }

  const result = await signUp(name, email, password);

  if (result.success) {
    redirect("/");
  } else {
    return { status: "error", data, errors: { formErrors: [result.message] } };
  }
}
