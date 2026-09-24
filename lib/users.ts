"use server";

import { auth } from "@/lib/auth";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User as PrismaUser } from "../generated/prisma/client";

export type User = Omit<PrismaUser, "image"> & {
  image?: PrismaUser["image"];
};

export type Error = {
  message: string;
};

export type Result<T> =
  { success: true; data: T } | { success: false; message: string };

export const signIn = async (
  email: string,
  password: string,
): Promise<Result<User>> => {
  try {
    const { user } = await auth.api.signInEmail({
      body: { email, password },
    });

    return { success: true, data: user as User };
  } catch (error) {
    console.error("Error signing in:", error);

    return {
      success: false,
      message: "Invalid email or password.",
    };
  }
};

export const signOut = async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
};

export const signUp = async (
  name: string,
  email: string,
  password: string,
): Promise<Result<User>> => {
  try {
    const { user } = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    return { success: true, data: user as User };
  } catch (error) {
    if (error instanceof APIError) {
      console.log("API Error:", error.message);

      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: "Error signing up",
    };
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  return session.user as User;
};

export const requireUser = async (): Promise<User> => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return user;
};
