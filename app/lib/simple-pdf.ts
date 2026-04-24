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

function createTextContent(lines: string[]) {
  let y = 770;
  const operations: string[] = [];

  operations.push("BT");
  operations.push("/F1 24 Tf");
  operations.push(`72 ${y} Td`);
  operations.push(`(${escapePdfText(lines[0] || "Artist Vault Press Kit")}) Tj`);
  operations.push("ET");
  y -= 34;

  operations.push("BT");
  operations.push("/F1 12 Tf");

  const bodyLines = lines.slice(1);
  for (const line of bodyLines) {
    if (y < 72) break;
    operations.push(`72 ${y} Td`);
    operations.push(`(${escapePdfText(line)}) Tj`);
    y -= 16;
  }

  operations.push("ET");
  return operations.join("\n");
}

function buildPdfBytes(textLines: string[]) {
  const stream = createTextContent(textLines);

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(stream, "utf-8")} >> stream\n${stream}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += `${object}\n`;
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

type PressKitPdfInput = {
  artistName: string;
  title: string;
  shortBio?: string | null;
  longBio?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  links: string[];
  releases: string[];
};

export function createPressKitPdf(input: PressKitPdfInput) {
  const lines: string[] = [];
  lines.push(input.title || `${input.artistName} Press Kit`);
  lines.push("");
  lines.push(`Artist: ${input.artistName}`);

  if (input.contactEmail) lines.push(`Contact: ${input.contactEmail}`);
  if (input.websiteUrl) lines.push(`Website: ${input.websiteUrl}`);

  lines.push("");
  lines.push("Short Bio");
  lines.push(...wrapLines(input.shortBio || "No short bio saved yet."));
  lines.push("");
  lines.push("Long Bio");
  lines.push(...wrapLines(input.longBio || "No long bio saved yet."));
  lines.push("");
  lines.push("Links");
  lines.push(...(input.links.length ? input.links.flatMap((line) => wrapLines(`- ${line}`)) : ["No links saved."]));
  lines.push("");
  lines.push("Selected Releases");
  lines.push(...(input.releases.length ? input.releases.flatMap((line) => wrapLines(`- ${line}`)) : ["No releases saved."]));

  return buildPdfBytes(lines);
}
