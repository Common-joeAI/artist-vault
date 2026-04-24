import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ZipEntry = {
  name: string;
  data: Buffer;
  crc: number;
  offset: number;
};

const CONNECTOR_DIR = path.join(process.cwd(), "browser-extension", "artist-vault-connector");
const FILES = ["manifest.json", "popup.html", "popup.js", "background.js", "content.js"];

export async function GET() {
  const entries: ZipEntry[] = [];

  for (const file of FILES) {
    const fullPath = path.join(CONNECTOR_DIR, file);
    const data = await fs.readFile(fullPath);

    entries.push({
      name: `artist-vault-connector/${file}`,
      data,
      crc: crc32(data),
      offset: 0,
    });
  }

  const zip = makeZip(entries);

  return new NextResponse(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="artist-vault-connector.zip"',
      "Cache-Control": "no-store",
    },
  });
}

function makeZip(entries: ZipEntry[]) {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    entry.offset = offset;
    const name = Buffer.from(entry.name, "utf8");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(entry.crc >>> 0, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, name, entry.data);
    offset += local.length + name.length + entry.data.length;

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0, 8);
    c.writeUInt16LE(0, 10);
    c.writeUInt16LE(0, 12);
    c.writeUInt16LE(0, 14);
    c.writeUInt32LE(entry.crc >>> 0, 16);
    c.writeUInt32LE(entry.data.length, 20);
    c.writeUInt32LE(entry.data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt16LE(0, 30);
    c.writeUInt16LE(0, 32);
    c.writeUInt16LE(0, 34);
    c.writeUInt16LE(0, 36);
    c.writeUInt32LE(0, 38);
    c.writeUInt32LE(entry.offset, 42);

    central.push(c, name);
  }

  const centralStart = offset;
  const centralBuffer = Buffer.concat(central);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuffer, end]);
}

function crc32(input: Buffer) {
  let crc = 0xffffffff;

  for (const byte of input) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
