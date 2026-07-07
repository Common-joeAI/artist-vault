import { db } from "@/lib/db";

export async function getPressKitData(artistId: string) {
  const artist = await db.artistProfile.findUnique({
    where: { id: artistId },
    include: {
      links: true,
      releases: {
        orderBy: { releaseDate: "desc" },
        take: 5,
        include: {
          tracks: {
            orderBy: { trackNumber: "asc" },
            take: 3,
          },
        },
      },
    },
  });

  if (!artist) return null;

  const styleDna = await db.styleDna.findFirst({
    where: { artistId },
    orderBy: { createdAt: "desc" },
  });

  const pressKit = await db.pressKit.findFirst({
    where: { artistId },
    orderBy: { generatedAt: "desc" },
  });

  return { artist, styleDna, pressKit };
}

export function buildPressKitSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
