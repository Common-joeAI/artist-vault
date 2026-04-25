"use server";

import { redirect } from "next/navigation";
import { createUserAccount, createSession } from "@/lib/auth";
import { db } from "@/lib/db";

export type SignupFormState = {
  error?: string;
};

export async function signupAction(
  _prev: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const role = (formData.get("role") as string) ?? "artist";

  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  if (!["artist", "radio_station"].includes(role)) {
    return { error: "Invalid account type." };
  }

  try {
    const { user } = await createUserAccount(email, password, {
      name,
      role: role as "artist" | "radio_station",
    });

    // If artist, create default artist profile
    if (role === "artist") {
      await db.artistProfile.create({
        data: {
          ownerUserId: user.id,
          name: name?.trim() || email.split("@")[0],
        },
      });
    }

    await createSession({
      id: user.id,
      email: user.email,
      role: user.role as "artist" | "radio_station" | "admin",
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Signup failed." };
  }

  // Redirect based on role
  if (role === "radio_station") {
    redirect("/radio/signup/profile");
  } else {
    redirect("/vault/onboarding");
  }
}
