import type { ImportPreview, ReleaseType } from "@/lib/import-adapters";

type SpotifyResourceType = "track" | "album" | "artist";

type SpotifyTrackResponse = {
  id: string;
  name: string;
  type: "track";
  artists?: Array<{ name: string }>;
  album?: {
    name: string;
    album_type?: string;
  };
};

type SpotifyAlbumResponse = {
  id: string;
  name: string;
  type: "album";
  album_type?: string;
  artists?: Array<{ name: string }>;
  total_tracks?: number;
};

type SpotifyArtistResponse = {
  id: string;
  name: string;
  type: "artist";
  genres?: string[];
  followers?: { total?: number };
};

type SpotifyArtistAlbumsResponse = {
  items?: Array<{
    id: string;
    name: string;
    album_type?: string;
    total_tracks?: number;
  }>;
};

type SpotifyTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: SpotifyTokenCache | null = null;

function getSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() ?? "";
  return { clientId, clientSecret };
}

export function hasSpotifyCredentials() {
  const { clientId, clientSecret } = getSpotifyCredentials();
  return Boolean(clientId && clientSecret);
}

function normalizeSpotifyUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function parseSpotifyResource(url: string): { kind: SpotifyResourceType; id: string } | null {
  const parsed = normalizeSpotifyUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();
  if (!host.includes("spotify.com")) return null;

  const parts = parsed.pathname.split("/").filter(Boolean);
  if ((parts[0] === "intl" || parts[0]?.startsWith("intl-")) && parts.length >= 3) {
    parts.splice(0, 1);
  }

  const kind = parts[0];
  const id = parts[1]?.split("?")[0]?.trim();

  if (!id) return null;
  if (kind === "track" || kind === "album" || kind === "artist") {
    return { kind, id };
  }

  return null;
}

function inferReleaseType(value: string | null | undefined, totalTracks?: number): ReleaseType {
  const lowered = (value ?? "").toLowerCase();

  if (lowered === "album") return "ALBUM";
  if (lowered === "single") return totalTracks && totalTracks > 1 ? "EP" : "SINGLE";
  if (lowered === "compilation") return "ALBUM";
  if (lowered === "appears_on") return totalTracks && totalTracks <= 2 ? "SINGLE" : "ALBUM";

  return totalTracks && totalTracks > 1 ? "EP" : "SINGLE";
}

function summarizeGenres(genres: string[] | undefined) {
  if (!genres?.length) return null;
  return genres.slice(0, 3).join(", ");
}

async function getSpotifyAccessToken() {
  const { clientId, clientSecret } = getSpotifyCredentials();

  if (!clientId || !clientSecret) {
    throw new Error("Spotify importer is not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.");
  }

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({ grant_type: "client_credentials" }).toString();
  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new Error("Spotify auth did not return an access token.");
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max((payload.expires_in ?? 3600) - 60, 60) * 1000,
  };

  return payload.access_token;
}

async function spotifyRequest<T>(path: string, params?: Record<string, string>) {
  const token = await getSpotifyAccessToken();
  const url = new URL(`https://api.spotify.com${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401) tokenCache = null;
    throw new Error(`Spotify API request failed with ${response.status} for ${path}.`);
  }

  return (await response.json()) as T;
}

function dedupeReleases(releases: ImportPreview["discoveredReleases"]) {
  const seen = new Set<string>();
  return releases.filter((release) => {
    const key = release.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function buildTrackPreview(url: string, id: string): Promise<ImportPreview> {
  const track = await spotifyRequest<SpotifyTrackResponse>(`/v1/tracks/${id}`);
  const artistNames = (track.artists ?? []).map((artist) => artist.name).filter(Boolean);
  const albumName = track.album?.name?.trim();

  const discoveredReleases: ImportPreview["discoveredReleases"] = [
    { title: track.name.trim(), inferredType: "SINGLE" },
  ];

  if (albumName && albumName.toLowerCase() !== track.name.trim().toLowerCase()) {
    discoveredReleases.push({
      title: albumName,
      inferredType: inferReleaseType(track.album?.album_type, undefined),
    });
  }

  return {
    url,
    platform: "spotify",
    pageTitle: `${track.name}${artistNames.length ? ` - song by ${artistNames.join(", ")}` : ""} | Spotify`,
    description: albumName ? `Track from ${albumName}` : artistNames.length ? `Track by ${artistNames.join(", ")}` : null,
    discoveredReleases: dedupeReleases(discoveredReleases),
  };
}

async function buildAlbumPreview(url: string, id: string): Promise<ImportPreview> {
  const album = await spotifyRequest<SpotifyAlbumResponse>(`/v1/albums/${id}`);
  const artistNames = (album.artists ?? []).map((artist) => artist.name).filter(Boolean);

  return {
    url,
    platform: "spotify",
    pageTitle: `${album.name}${artistNames.length ? ` by ${artistNames.join(", ")}` : ""} | Spotify`,
    description: artistNames.length ? `${album.album_type ?? "release"} by ${artistNames.join(", ")}` : null,
    discoveredReleases: [
      {
        title: album.name.trim(),
        inferredType: inferReleaseType(album.album_type, album.total_tracks),
      },
    ],
  };
}

async function buildArtistPreview(url: string, id: string): Promise<ImportPreview> {
  const [artist, albums] = await Promise.all([
    spotifyRequest<SpotifyArtistResponse>(`/v1/artists/${id}`),
    spotifyRequest<SpotifyArtistAlbumsResponse>(`/v1/artists/${id}/albums`, {
      include_groups: "album,single",
      limit: "20",
      market: "US",
    }),
  ]);

  return {
    url,
    platform: "spotify",
    pageTitle: `${artist.name} | Spotify`,
    description: summarizeGenres(artist.genres) ?? (artist.followers?.total ? `${artist.followers.total.toLocaleString("en-US")} Spotify followers` : null),
    discoveredReleases: dedupeReleases(
      (albums.items ?? []).map((album) => ({
        title: album.name.trim(),
        inferredType: inferReleaseType(album.album_type, album.total_tracks),
      })),
    ),
  };
}

export async function buildSpotifyImportPreview(url: string): Promise<ImportPreview | null> {
  const resource = parseSpotifyResource(url);
  if (!resource) return null;

  if (!hasSpotifyCredentials()) {
    return null;
  }

  switch (resource.kind) {
    case "track":
      return buildTrackPreview(url, resource.id);
    case "album":
      return buildAlbumPreview(url, resource.id);
    case "artist":
      return buildArtistPreview(url, resource.id);
    default:
      return null;
  }
}
