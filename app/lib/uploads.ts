import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";

const MAX_MB = Number(process.env.ARTIST_VAULT_MAX_UPLOAD_MB || 25);
const MAX_BYTES = MAX_MB * 1024 * 1024;

export type UploadCategory = "press" | "covers" | "masters" | "previews" | "misc";

const allowedCategories = new Set<UploadCategory>(["press", "covers", "masters", "previews", "misc"]);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/mp4",
  "audio/x-m4a",
  "application/pdf",
  "text/plain",
]);
const blockedExtensions = new Set([".html", ".htm", ".svg", ".js", ".mjs", ".cjs", ".exe", ".sh", ".php"]);

function getUploadRootDir() {
  return path.resolve(process.cwd(), process.env.ARTIST_VAULT_UPLOAD_DIR || "./public/uploads");
}

function sanitizeSegment(input: string) {
  return input.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function getExtension(filename: string) {
  return path.extname(filename).toLowerCase();
}

function getPublicBaseUrl() {
  return (process.env.ARTIST_VAULT_UPLOAD_PUBLIC_BASE || process.env.ARTIST_VAULT_PUBLIC_URL || "/uploads").replace(/\/$/, "");
}

function normalizeCategory(input: string): UploadCategory {
  const normalized = input.trim().toLowerCase() as UploadCategory;
  if (!allowedCategories.has(normalized)) {
    throw new Error("Invalid upload category.");
  }
  return normalized;
}

function assertAllowedFile(file: File) {
  const extension = getExtension(file.name);

  if (blockedExtensions.has(extension)) {
    throw new Error("That file type is blocked for security reasons.");
  }

  if (file.type && !allowedMimeTypes.has(file.type)) {
    throw new Error("That file type is not allowed.");
  }
}

export async function listUploads(userId?: string) {
  return db.upload.findMany({
    where: userId ? { uploadedByUserId: userId } : undefined,
    orderBy: { uploadedAt: "desc" },
  });
}

export async function saveUploadedFile(file: File, category: UploadCategory, userId?: string) {
  if (file.size > MAX_BYTES) throw new Error("File too large.");
  if (!file.name.trim()) throw new Error("File name is required.");

  assertAllowedFile(file);

  const rootDir = getUploadRootDir();
  const safeCategory = normalizeCategory(category);
  const extension = getExtension(file.name);
  const baseName = sanitizeSegment(path.basename(file.name, extension)) || "upload";

  const storedFilename = `${baseName}-${randomUUID()}${extension}`;
  const relativePath = path.join(safeCategory, storedFilename);
  const absoluteDir = path.join(rootDir, safeCategory);
  const absolutePath = path.join(rootDir, relativePath);

  await mkdir(absoluteDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer, { flag: "wx" });

  return db.upload.create({
    data: {
      filename: storedFilename,
      originalName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      category: safeCategory,
      relativePath: relativePath.split(path.sep).join("/"),
      publicUrl: `${getPublicBaseUrl()}/${relativePath.split(path.sep).join("/")}`,
      uploadedByUserId: userId,
    },
  });
}

export async function deleteUpload(id: string, userId?: string) {
  const upload = await db.upload.findUnique({ where: { id } });
  if (!upload) throw new Error("Not found.");
  if (userId && upload.uploadedByUserId && upload.uploadedByUserId !== userId) {
    throw new Error("Not found.");
  }

  const rootDir = getUploadRootDir();
  const absolutePath = path.join(rootDir, upload.relativePath);

  try {
    await unlink(absolutePath);
  } catch {
    // Ignore missing files so the DB record can still be cleaned up.
  }

  await db.upload.delete({ where: { id } });
}
