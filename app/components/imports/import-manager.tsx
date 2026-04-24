"use client";

import { useMemo, useState } from "react";
import styles from "./import-manager.module.css";

type DiscoveredRelease = {
  title: string;
  inferredType: "SINGLE" | "EP" | "ALBUM";
};

type Preview = {
  url: string;
  platform: string;
  pageTitle: string | null;
  description: string | null;
  discoveredReleases: DiscoveredRelease[];
};

export function ImportManager() {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const discoveredCount = useMemo(
    () => previews.reduce((count, preview) => count + preview.discoveredReleases.length, 0),
    [previews],
  );

  async function scanLinks() {
    setLoading(true);
    setStatus(null);
    setErrors([]);

    try {
      const response = await fetch("/api/import-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const payload = (await response.json()) as { previews?: Preview[]; errors?: string[]; error?: string };

      if (!response.ok) {
        setErrors(payload.error ? [payload.error] : ["Unable to scan artist links."]);
        return;
      }

      setPreviews(payload.previews ?? []);
      setErrors(payload.errors ?? []);
      setStatus("Link scan complete.");
    } catch {
      setErrors(["A network or server error occurred while scanning links."]);
    } finally {
      setLoading(false);
    }
  }

  async function createDrafts() {
    const releases = previews.flatMap((preview) =>
      preview.discoveredReleases.map((release) => ({
        ...release,
        sourceUrl: preview.url,
        platform: preview.platform,
      })),
    );

    if (!releases.length) {
      setErrors(["No discovered releases are available to import."]);
      return;
    }

    setCreating(true);
    setStatus(null);
    setErrors([]);

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

      setStatus(`Created ${payload.created?.length ?? 0} draft release(s). Skipped ${payload.skipped?.length ?? 0}.`);
    } catch {
      setErrors(["A network or server error occurred while creating draft releases."]);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.actions}>
        <button className={styles.button} type="button" onClick={scanLinks} disabled={loading}>
          {loading ? "Scanning…" : "Scan saved artist links"}
        </button>
        <button className={styles.secondary} type="button" onClick={createDrafts} disabled={creating || !discoveredCount}>
          {creating ? "Creating drafts…" : "Create release drafts"}
        </button>
      </div>

      {status ? <div className={styles.success}>{status}</div> : null}
      {errors.length ? (
        <div className={styles.error}>
          {errors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      ) : null}

      <div className={styles.muted}>Discovered releases: {discoveredCount}</div>

      <div className={styles.grid}>
        {previews.map((preview) => (
          <div className={styles.card} key={`${preview.platform}-${preview.url}`}>
            <div className={styles.badge}>{preview.platform}</div>
            <h3>{preview.pageTitle ?? preview.url}</h3>
            <div className={styles.muted}>{preview.description ?? "No description found on this page."}</div>
            <div className={styles.list}>
              {preview.discoveredReleases.length ? (
                preview.discoveredReleases.map((release) => (
                  <div className={styles.release} key={`${preview.url}-${release.title}`}>
                    <div>
                      <strong>{release.title}</strong>
                    </div>
                    <span className={styles.badge}>{release.inferredType}</span>
                  </div>
                ))
              ) : (
                <div className={styles.muted}>No release candidates discovered from this page.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
