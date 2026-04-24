"use server";

import { redirect } from "next/navigation";
import { authenticateUser, createSession } from "@/lib/auth";
import { db } from "@/lib/db";

export type LoginFormState = {
  error?: string;
};

export async function loginAction(_: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter both email and password." };
  }

  const user = await authenticateUser(email, password);

  if (!user) {
    return { error: "Invalid credentials." };
  }

  let nextPath = "/vault";

  if (user.userId) {
    const profile = await db.artistProfile.findFirst({
      where: { ownerUserId: user.userId },
      select: { id: true },
    });

    if (!profile) {
      nextPath = "/vault/onboarding";
    }
  }

  await createSession(user);
  redirect(nextPath);
}
