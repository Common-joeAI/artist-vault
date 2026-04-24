import { buildImportPreview } from "@/lib/import-adapters";

type ImportPreview = Awaited<ReturnType<typeof buildImportPreview>>;
type ReleaseType = "SINGLE" | "EP" | "ALBUM";

type EnhancedRelease = {
  title: string;
  inferredType: ReleaseType;
  confidence: "high" | "medium" | "low";
};

export type EnhancedImportPreview = ImportPreview & {
  curatedReleases: EnhancedRelease[];
};

function cleanTitle(value: string, platform: string) {
  let title = value.replace(/\s+/g, " ").trim();

  if (platform === "spotify") {
    title = title.replace(/\s*\|\s*Spotify$/i, "");
  }

  if (platform === "apple_music") {
    title = title.replace(/\s*-\s*Apple Music$/i, "");
  }

  if (platform === "youtube") {
    title = title.replace(/\s*-\s*YouTube(?: Music)?$/i, "");
  }

  title = title.replace(/^Listen to\s+/i, "");
  title = title.replace(/\s+[–-]\s+Single$/i, "");

  return title.trim();
}

function inferType(title: string): ReleaseType {
  const lowered = title.toLowerCase();

  if (lowered.includes(" ep")) return "EP";
  if (lowered.includes(" album")) return "ALBUM";
  return "SINGLE";
}

function dedupe(releases: EnhancedRelease[]) {
  const seen = new Set<string>();
  return releases.filter((release) => {
    const key = release.title.toLowerCase();
    if (!release.title || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function buildEnhancedImportPreview(url: string): Promise<EnhancedImportPreview> {
  const base = await buildImportPreview(url);

  const curated: EnhancedRelease[] = base.discoveredReleases.map((release) => ({
    title: cleanTitle(release.title, base.platform),
    inferredType: release.inferredType,
    confidence: "high",
  }));

  if (!curated.length && base.pageTitle) {
    curated.push({
      title: cleanTitle(base.pageTitle, base.platform),
      inferredType: inferType(base.pageTitle),
      confidence: "low",
    });
  }

  return {
    ...base,
    curatedReleases: dedupe(curated).slice(0, 15),
  };
}
