"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./upload-manager.module.css";

type UploadRecord = {
  id: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  category: "press" | "covers" | "masters" | "previews" | "misc";
  relativePath: string;
  publicUrl: string;
  uploadedAt: string;
};

const categories = ["press", "covers", "masters", "previews", "misc"] as const;

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function UploadManager() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [category, setCategory] = useState<(typeof categories)[number] | "all">("all");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadUploads() {
    const response = await fetch("/api/uploads", { cache: "no-store" });
    const payload = (await response.json()) as { uploads?: UploadRecord[]; error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to load uploads.");
      return;
    }

    setUploads(payload.uploads ?? []);
  }

  useEffect(() => {
    void loadUploads();
  }, []);

  const filteredUploads = useMemo(() => {
    if (category === "all") return uploads;
    return uploads.filter((upload) => upload.category === category);
  }, [uploads, category]);

  async function upload() {
    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category === "all" ? "misc" : category);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { error?: string; upload?: UploadRecord };

      if (!response.ok) {
        setError(payload.error ?? "Upload failed.");
        return;
      }

      setStatus(`Uploaded ${payload.upload?.originalName ?? file.name}.`);
      setFile(null);
      const input = document.getElementById("vault-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadUploads();
    } catch {
      setError("A network or server error occurred during upload.");
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Copied asset URL.");
    } catch {
      setError("Unable to copy URL.");
    }
  }

  async function removeUpload(id: string, name: string) {
    setDeletingId(id);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/uploads", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to delete upload.");
        return;
      }

      setStatus(`Deleted ${name}.`);
      await loadUploads();
    } catch {
      setError("A network or server error occurred during delete.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.row}>
          <select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number] | "all")}>
            <option value="all">all categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            id="vault-file-input"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <button className={styles.button} type="button" onClick={upload} disabled={loading}>
            {loading ? "Uploading…" : "Upload file"}
          </button>
        </div>
        <div className={styles.meta}>Showing {filteredUploads.length} asset(s)</div>
      </div>

      {status ? <div className={styles.success}>{status}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.meta}>
        Use <strong>covers</strong> for release artwork, <strong>press</strong> for hero images and promo assets, <strong>masters</strong> for full audio, and <strong>previews</strong> for lighter listening assets.
      </div>

      <div className={styles.grid}>
        {filteredUploads.map((upload) => {
          const isImage = upload.contentType.startsWith("image/");
          const isAudio = upload.contentType.startsWith("audio/");

          return (
            <article className={styles.card} key={upload.id}>
              <div className={styles.preview}>
                {isImage ? (
                  <img className={styles.imagePreview} src={upload.publicUrl} alt={upload.originalName} />
                ) : isAudio ? (
                  <audio className={styles.audioPreview} controls preload="none" src={upload.publicUrl} />
                ) : (
                  <div className={styles.placeholder}>No inline preview</div>
                )}
              </div>

              <div className={styles.cardHeader}>
                <div className={styles.badge}>{upload.category}</div>
                <div className={styles.fileMeta}>{formatBytes(upload.size)}</div>
              </div>

              <h3 className={styles.title}>{upload.originalName}</h3>
              <div className={styles.meta}>Stored as: {upload.filename}</div>
              <div className={styles.meta}>Type: {upload.contentType || "unknown"}</div>
              <div className={styles.meta}>Added: {formatDate(upload.uploadedAt)}</div>
              <div className={styles.url}>{upload.publicUrl}</div>

              <div className={styles.row}>
                <a className={styles.secondary} href={upload.publicUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
                <button className={styles.copyButton} type="button" onClick={() => copyUrl(upload.publicUrl)}>
                  Copy URL
                </button>
                <button
                  className={styles.deleteButton}
                  type="button"
                  onClick={() => removeUpload(upload.id, upload.originalName)}
                  disabled={deletingId === upload.id}
                >
                  {deletingId === upload.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
