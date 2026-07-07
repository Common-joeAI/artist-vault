function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLines(value: string, maxWidth = 88) {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!word) continue;
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

type TrackInfo = {
  title: string;
  isrc: string | null;
  durationSeconds: number | null;
  bpm: number | null;
  proStatus: string;
};

type ReleaseInfo = {
  title: string;
  releaseType: string;
  releaseDate: string | null;
  coverArtUrl: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  isReleaseReady: boolean;
  tracks: TrackInfo[];
};

type PressKitPdfInput = {
  artistName: string;
  title: string;
  shortBio?: string | null;
  longBio?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  links: string[];
  releases: ReleaseInfo[] | string[];
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function proLabel(status: string): string {
  if (status === "REGISTERED") return "[PRO ✓]";
  if (status === "PENDING") return "[PRO pending]";
  return "";
}

function createTextContent(lines: string[]) {
  let y = 770;
  const ops: string[] = [];

  // Title  -  large
  ops.push("BT", "/F2 26 Tf", `72 ${y} Td`, `(${escapePdfText(lines[0] || "Press Kit")}) Tj`, "ET");
  y -= 8;

  // Underline rule
  ops.push(`q 0.4 0.22 0.98 rg 72 ${y} 468 2 re f Q`);
  y -= 20;

  ops.push("BT", "/F1 11 Tf");
  let inBT = true;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (y < 72) break;

    if (line.startsWith("##SECTION##")) {
      // Section header
      if (inBT) { ops.push("ET"); inBT = false; }
      y -= 6;
      const heading = line.replace("##SECTION##", "").trim();
      ops.push("BT", "/F2 13 Tf", `72 ${y} Td`, `(${escapePdfText(heading)}) Tj`, "ET");
      y -= 4;
      ops.push(`q 0.55 0.55 0.65 rg 72 ${y} 468 1 re f Q`);
      y -= 14;
      ops.push("BT", "/F1 11 Tf");
      inBT = true;
    } else if (line.startsWith("##BOLD##")) {
      if (inBT) { ops.push("ET"); inBT = false; }
      const text = line.replace("##BOLD##", "").trim();
      ops.push("BT", "/F2 11 Tf", `72 ${y} Td`, `(${escapePdfText(text)}) Tj`, "ET");
      y -= 15;
      ops.push("BT", "/F1 11 Tf");
      inBT = true;
    } else if (line === "") {
      y -= 8;
    } else {
      if (!inBT) { ops.push("BT", "/F1 11 Tf"); inBT = true; }
      ops.push(`72 ${y} Td`, `(${escapePdfText(line)}) Tj`);
      y -= 15;
    }
  }

  if (inBT) ops.push("ET");
  return ops.join("\n");
}

function buildPdfBytes(textLines: string[]) {
  const stream = createTextContent(textLines);

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
    `6 0 obj << /Length ${Buffer.byteLength(stream, "utf-8")} >> stream\n${stream}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += `${obj}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf-8");
}

export function createPressKitPdf(input: PressKitPdfInput) {
  const lines: string[] = [];

  // Header
  lines.push(input.title || `${input.artistName} Press Kit`);
  lines.push("");

  // Contact block
  lines.push("##SECTION##Contact");
  lines.push(`Artist: ${input.artistName}`);
  if (input.contactEmail) lines.push(`Contact: ${input.contactEmail}`);
  if (input.websiteUrl) lines.push(`Website: ${input.websiteUrl}`);
  lines.push("");

  // Short bio
  lines.push("##SECTION##Short Bio");
  lines.push(...wrapLines(input.shortBio || "No short bio saved yet."));
  lines.push("");

  // Long bio
  lines.push("##SECTION##Artist Bio");
  lines.push(...wrapLines(input.longBio || "No long bio saved yet."));
  lines.push("");

  // Links
  if (input.links.length) {
    lines.push("##SECTION##Links");
    for (const link of input.links) lines.push(...wrapLines(`• ${link}`));
    lines.push("");
  }

  // Releases  -  rich format
  if (input.releases.length) {
    lines.push("##SECTION##Releases");
    for (const rel of input.releases) {
      if (typeof rel === "string") {
        lines.push(...wrapLines(`• ${rel}`));
        continue;
      }
      const r = rel as ReleaseInfo;
      const releaseLine = [
        r.title,
        r.releaseType,
        r.releaseDate ? `(${r.releaseDate})` : "",
        r.isReleaseReady ? "[Release Ready ✓]" : "",
      ].filter(Boolean).join("  |  ");
      lines.push(`##BOLD##${releaseLine}`);

      if (r.spotifyUrl) lines.push(`  Spotify: ${r.spotifyUrl}`);
      if (r.appleMusicUrl) lines.push(`  Apple Music: ${r.appleMusicUrl}`);

      if (r.tracks.length) {
        for (const t of r.tracks) {
          const dur = t.durationSeconds ? ` (${formatDuration(t.durationSeconds)})` : "";
          const bpm = t.bpm ? `  ${t.bpm} BPM` : "";
          const isrc = t.isrc ? `  ISRC: ${t.isrc}` : "";
          const pro = t.proStatus !== "NOT_STARTED" ? `  ${proLabel(t.proStatus)}` : "";
          lines.push(...wrapLines(`    ${t.title}${dur}${bpm}${isrc}${pro}`));
        }
      }
      lines.push("");
    }
  }

  return buildPdfBytes(lines);
}
