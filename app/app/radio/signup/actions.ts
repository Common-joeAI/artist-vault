"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export type RadioProfileState = {
  error?: string;
};

export async function saveRadioProfileAction(
  _prev: RadioProfileState,
  formData: FormData
): Promise<RadioProfileState> {
  const session = await requireSession();

  const stationName = (formData.get("stationName") as string)?.trim();
  const contactName = (formData.get("contactName") as string)?.trim() || null;
  const contactEmail = (formData.get("contactEmail") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const state = (formData.get("state") as string)?.trim().toUpperCase() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const genres = formData.getAll("genres") as string[];
  const notifyOnRelease = formData.get("notifyOnRelease") === "true";

  if (!stationName) {
    return { error: "Station name is required." };
  }

  try {
    await db.radioStation.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        stationName,
        contactName,
        contactEmail,
        city,
        state,
        website,
        genrePreferences: genres.length > 0 ? genres.join(",") : null,
        notifyOnRelease,
      },
      update: {
        stationName,
        contactName,
        contactEmail,
        city,
        state,
        website,
        genrePreferences: genres.length > 0 ? genres.join(",") : null,
        notifyOnRelease,
      },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save profile." };
  }

  redirect("/radio/dashboard");
}
