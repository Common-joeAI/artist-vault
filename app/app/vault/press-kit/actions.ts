"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function createUniqueSlug(base: string, currentId?: string) {
  const root = slugify(base) || "press-kit";
  let candidate = root;
  let counter = 1;

  while (true) {
    const existing = await db.pressKit.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === currentId) return candidate;
    counter += 1;
    candidate = `${root}-${counter}`;
  }
}

export async function savePressKitAction(formData: FormData) {
  await requireSession();

  const artist = await getPrimaryArtistProfile();

  if (!artist) {
    redirect("/vault/onboarding");
  }

  const existing = artist.pressKits[0];
  const baseTitle = String(formData.get("title") ?? "").trim() || `${artist.name} Press Kit`;
  const slug = await createUniqueSlug(artist.name, existing?.id);

  const data = {
    title: baseTitle,
    slug,
    isPublic: true,
    shortBio: String(formData.get("shortBio") ?? "").trim() || null,
    longBio: String(formData.get("longBio") ?? "").trim() || null,
    heroImageUrl: String(formData.get("heroImageUrl") ?? "").trim() || null,
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || null,
    contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
  };

  if (existing) {
    await db.pressKit.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await db.pressKit.create({
      data: {
        artistId: artist.id,
        ...data,
      },
    });
  }

  redirect("/vault/press-kit");
}
