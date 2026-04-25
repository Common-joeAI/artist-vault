/**
 * import-store.ts — DB-backed import session store
 * Replaces the old file-based distrokid-import-store.ts
 * Supports: distrokid | soundon
 */

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "node:crypto";

export type ImportProvider = "distrokid" | "soundon";

export async function createImportSession(provider: ImportProvider) {
  const session = await getSession();
  const sessionToken = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  const record = await db.importSession.create({
    data: {
      userId: session?.userId ?? null,
      provider,
      sessionToken,
      status: "pending",
      expiresAt,
    },
  });

  return record;
}

export async function getImportSession(token: string) {
  const record = await db.importSession.findUnique({
    where: { sessionToken: token },
  });

  if (!record) return null;
  if (record.expiresAt < new Date() && record.status === "pending") {
    await db.importSession.update({
      where: { sessionToken: token },
      data: { status: "failed" },
    });
    return null;
  }

  return record;
}

export async function markSessionRunning(token: string) {
  await db.importSession.update({
    where: { sessionToken: token },
    data: { status: "running" },
  });
}

export async function markSessionCompleted(
  token: string,
  result: {
    releaseCount: number;
    importedReleaseIds: string[];
    rawPayload?: unknown;
    errors?: string[];
  }
) {
  await db.importSession.update({
    where: { sessionToken: token },
    data: {
      status: result.releaseCount > 0 || !result.errors?.length ? "completed" : "failed",
      releaseCount: result.releaseCount,
      importedReleaseIds: result.importedReleaseIds,
      rawPayloadJson: result.rawPayload as object ?? undefined,
      errors: result.errors ?? [],
      completedAt: new Date(),
    },
  });
}

export async function markSessionFailed(token: string, errors: string[]) {
  await db.importSession.update({
    where: { sessionToken: token },
    data: {
      status: "failed",
      errors,
    },
  });
}
