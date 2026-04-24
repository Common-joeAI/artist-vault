import { db } from "@/lib/db";

export async function isSetupComplete() {
  try {
    return (await db.user.count()) > 0;
  } catch {
    return false;
  }
}

export function getSetupTokenRequirement() {
  const token = process.env.ARTIST_VAULT_SETUP_TOKEN?.trim() ?? "";
  return {
    required: process.env.NODE_ENV === "production",
    token,
  };
}

export function isValidSetupToken(value: string | null | undefined) {
  const expected = process.env.ARTIST_VAULT_SETUP_TOKEN?.trim() ?? "";

  if (process.env.NODE_ENV !== "production") return true;
  if (!expected) return false;

  return value?.trim() === expected;
}
