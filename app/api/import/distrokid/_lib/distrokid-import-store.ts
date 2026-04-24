import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type ImportSessionRecord = {
  sessionToken: string;
  provider: "distrokid";
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
  expiresAt: string;
  completedAt: string | null;
  releaseCount: number;
  importedFiles: string[];
  payloadFile: string | null;
  errors: string[];
};

const ROOT = path.join(process.cwd(), "storage", "distrokid-imports");
const SESSION_DIR = path.join(ROOT, "sessions");
const PAYLOAD_DIR = path.join(ROOT, "payloads");
const INBOX_DIR = path.join(ROOT, "inbox");

async function ensureDirs() {
  await Promise.all([
    fs.mkdir(SESSION_DIR, { recursive: true }),
    fs.mkdir(PAYLOAD_DIR, { recursive: true }),
    fs.mkdir(INBOX_DIR, { recursive: true }),
  ]);
}

function sessionFile(token: string) {
  return path.join(SESSION_DIR, `${token}.json`);
}

export function inboxDir() {
  return INBOX_DIR;
}

export async function createImportSession(): Promise<ImportSessionRecord> {
  await ensureDirs();

  const sessionToken = crypto.randomBytes(24).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

  const record: ImportSessionRecord = {
    sessionToken,
    provider: "distrokid",
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    completedAt: null,
    releaseCount: 0,
    importedFiles: [],
    payloadFile: null,
    errors: [],
  };

  await fs.writeFile(sessionFile(sessionToken), JSON.stringify(record, null, 2), "utf8");
  return record;
}

export async function getImportSession(token: string): Promise<ImportSessionRecord | null> {
  await ensureDirs();

  try {
    const raw = await fs.readFile(sessionFile(token), "utf8");
    return JSON.parse(raw) as ImportSessionRecord;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeSession(record: ImportSessionRecord) {
  await ensureDirs();
  await fs.writeFile(sessionFile(record.sessionToken), JSON.stringify(record, null, 2), "utf8");
}

export async function markSessionRunning(token: string) {
  const record = await getImportSession(token);
  if (!record) {
    throw new Error("Import session not found.");
  }

  record.status = "running";
  await writeSession(record);
}

export async function appendSessionErrors(token: string, errors: string[]) {
  const record = await getImportSession(token);
  if (!record) {
    return;
  }

  const merged = [...record.errors, ...errors];
  record.errors = Array.from(new Set(merged)).slice(-50);
  record.status = "failed";
  await writeSession(record);
}

export async function saveRawPayload(token: string, payload: unknown): Promise<string> {
  await ensureDirs();

  const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}--${token}.json`;
  const fullPath = path.join(PAYLOAD_DIR, filename);
  await fs.writeFile(fullPath, JSON.stringify(payload, null, 2), "utf8");
  return filename;
}

export async function markSessionCompleted(
  token: string,
  input: {
    payloadFile: string | null;
    releaseCount: number;
    importedFiles: string[];
    errors?: string[];
  },
) {
  const record = await getImportSession(token);
  if (!record) {
    throw new Error("Import session not found.");
  }

  record.status = input.releaseCount > 0 ? "completed" : (input.errors?.length ? "failed" : "completed");
  record.payloadFile = input.payloadFile;
  record.releaseCount = input.releaseCount;
  record.importedFiles = input.importedFiles;
  record.errors = input.errors ?? [];
  record.completedAt = new Date().toISOString();

  await writeSession(record);
}
