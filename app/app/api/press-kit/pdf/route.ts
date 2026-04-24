import { getSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { createPressKitPdf } from "@/lib/simple-pdf";

function sanitizeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "press-kit";
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const profile = await getPrimaryArtistProfile();
  const pressKit = profile?.pressKits?.[0] ?? null;

  if (!profile) {
    return new Response("Run onboarding first.", { status: 400 });
  }

  const pdf = createPressKitPdf({
    artistName: profile.name,
    title: pressKit?.title ?? `${profile.name} Press Kit`,
    shortBio: pressKit?.shortBio ?? profile.bio,
    longBio: pressKit?.longBio ?? profile.bio,
    websiteUrl: pressKit?.websiteUrl ?? profile.links.find((link) => link.platform === "website")?.url,
    contactEmail: pressKit?.contactEmail,
    links: profile.links.map((link) => `${link.label ?? link.platform}: ${link.url}`),
    releases: profile.releases.slice(0, 8).map((release) => `${release.title} (${release.releaseType})`),
  });

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(profile.name)}-press-kit.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
