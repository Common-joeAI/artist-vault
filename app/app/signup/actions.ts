"use server";

import { redirect } from "next/navigation";
import { createSession, createUserAccount } from "@/lib/auth";

export type SignupFormState = {
  error?: string;
};

export async function signupAction(_: SignupFormState, formData: FormData): Promise<SignupFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    const user = await createUserAccount(email, password, name || undefined);
    await createSession({ email: user.email, userId: user.id, source: "db" });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create your account right now.",
    };
  }

  redirect("/vault/onboarding");
}
