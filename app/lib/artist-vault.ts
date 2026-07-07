import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function getScopedProfileWhere() {
  const session = await getSession();
  if (session?.userId) {
    return { ownerUserId: session.userId };
  }

  return {};
}

async function getScopedReleaseWhere(releaseId: string) {
  const session = await getSession();

  if (session?.userId) {
    return {
      id: releaseId,
      artist: {
        ownerUserId: session.userId,
      },
    };
  }

  return { id: releaseId };
}

export async function getPrimaryArtistProfile(_userId?: string) {
  return db.artistProfile.findFirst({
    where: await getScopedProfileWhere(),
    include: {
      links: true,
      releases: {
        orderBy: {
          releaseDate: "desc",
        },
        include: {
          tracks: {
            orderBy: {
              trackNumber: "asc",
            },
          },
        },
      },
      pressKits: {
        orderBy: {
          generatedAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getReleaseById(releaseId: string) {
  return db.release.findFirst({
    where: await getScopedReleaseWhere(releaseId),
    include: {
      artist: true,
      tracks: {
        orderBy: {
          trackNumber: "asc",
        },
      },
    },
  });
}

export function formatDisplayDate(value: Date | string | null | undefined) {
  if (!value) {
    return " - ";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return " - ";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}
