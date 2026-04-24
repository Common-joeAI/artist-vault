"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./advanced-import-manager.module.css";

type CuratedRelease = {
  title: string;
  inferredType: "SINGLE" | "EP" | "ALBUM";
  confidence: "high" | "medium" | "low";
};

type Preview = {
  url: string;
  platform: string;
  pageTitle: string | null;
  description: string | null;
  curatedReleases: CuratedRelease[];
};

export function AdvancedImportManager() {
  const [rawUrls, setRawUrls] = useState("");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const releaseCount = useMemo(
    () => previews.reduce((count, preview) => count + preview.curatedReleases.length, 0),
    [previews],
  );

  async function scan() {
    const urls = rawUrls
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (!urls.length) {
      setErrors(["Paste at least one public artist or release URL."]);
      return;
    }

    setLoading(true);
    setErrors([]);
    setStatus(null);

    try {
      const response = await fetch("/api/import-preview-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      const payload = (await response.json()) as { previews?: Preview[]; errors?: string[]; error?: string };

      if (!response.ok) {
        setErrors(payload.error ? [payload.error] : ["Unable to scan URLs."]);
        return;
      }

      setPreviews(payload.previews ?? []);
      setErrors(payload.errors ?? []);
      setStatus("Advanced scan complete.");
    } catch {
      setErrors(["A network or server error occurred during scan."]);
    } finally {
      setLoading(false);
    }
  }

  async function createDrafts() {
    const releases = previews.flatMap((preview) =>
      preview.curatedReleases.map((release) => ({
        ...release,
        sourceUrl: preview.url,
        platform: preview.platform,
      })),
    );

    if (!releases.length) {
      setErrors(["No curated releases are available to import."]);
      return;
    }

    setCreating(true);
    setErrors([]);
    setStatus(null);

    try {
      const response = await fetch("/api/import-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releases }),
      });

      const payload = (await response.json()) as { created?: string[]; skipped?: string[]; error?: string };

      if (!response.ok) {
        setErrors(payload.error ? [payload.error] : ["Unable to create imported drafts."]);
        return;
      }

      const createdCount = payload.created?.length ?? 0;
      const skippedCount = payload.skipped?.length ?? 0;
      setStatus(`Imported ${createdCount} release draft(s). Skipped ${skippedCount}.`);
    } catch {
      setErrors(["A network or server error occurred while creating draft releases."]);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.panel}>
      <textarea
        className={styles.textarea}
        value={rawUrls}
        onChange={(event) => setRawUrls(event.target.value)}
        placeholder="Paste one public artist or release URL per line..."
      />

      <div className={styles.actions}>
        <button className={styles.button} type="button" onClick={scan} disabled={loading}>
          {loading ? "Scanning…" : "Scan URLs"}
        </button>
        <button className={styles.secondary} type="button" onClick={createDrafts} disabled={creating || !releaseCount}>
          {creating ? "Importing…" : "Import curated releases"}
        </button>
        <Link className={styles.secondaryLink} href="/vault/releases">
          Open releases
        </Link>
      </div>

      {status ? <div className={styles.success}>{status}</div> : null}
      {errors.length ? (
        <div className={styles.error}>
          {errors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      ) : null}

      <div className={styles.meta}>Releases found: {releaseCount}</div>

      <div className={styles.grid}>
        {previews.map((preview) => (
          <div className={styles.card} key={`${preview.platform}-${preview.url}`}>
            <div className={styles.badge}>{preview.platform}</div>
            <h3>{preview.pageTitle ?? preview.url}</h3>
            <div className={styles.meta}>{preview.description ?? "No description found."}</div>
            <div className={styles.list}>
              {preview.curatedReleases.length ? (
                preview.curatedReleases.map((release) => (
                  <div className={styles.item} key={`${preview.url}-${release.title}`}>
                    <div>
                      <strong>{release.title}</strong>
                      <div className={styles.meta}>{release.confidence} confidence</div>
                    </div>
                    <span className={styles.badge}>{release.inferredType}</span>
                  </div>
                ))
              ) : (
                <div className={styles.meta}>No curated releases discovered from this page.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
