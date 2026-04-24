"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./asset-url-picker.module.css";

type UploadRecord = {
  id: string;
  originalName: string;
  publicUrl: string;
  category: "press" | "covers" | "masters" | "previews" | "misc";
  contentType: string;
};

type AssetUrlPickerProps = {
  inputId: string;
  defaultCategory?: UploadRecord["category"];
  label?: string;
};

const categories = ["press", "covers", "masters", "previews", "misc"] as const;

export function AssetUrlPicker({ inputId, defaultCategory = "misc", label = "Asset picker" }: AssetUrlPickerProps) {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [category, setCategory] = useState<UploadRecord["category"]>(defaultCategory);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function loadUploads() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/uploads");
      const payload = (await response.json()) as { uploads?: UploadRecord[] };
      setUploads(payload.uploads ?? []);
    } catch {
      setStatus("Unable to load uploads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUploads();
  }, []);

  const filtered = useMemo(() => uploads.filter((upload) => upload.category === category), [uploads, category]);

  function pick(url: string) {
    const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!input) {
      setStatus("Target field not found.");
      return;
    }
    input.value = url;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    setStatus("URL applied to field.");
  }

  return (
    <div className={styles.panel}>
      <div className={styles.meta}>{label}</div>
      <div className={styles.row}>
        <select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value as UploadRecord["category"])}>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button className={styles.button} type="button" onClick={loadUploads}>
          {loading ? "Refreshing…" : "Refresh uploads"}
        </button>
      </div>
      {status ? <div className={styles.meta}>{status}</div> : null}
      <div className={styles.list}>
        {filtered.length ? (
          filtered.map((upload) => (
            <div className={styles.item} key={upload.id}>
              <div>
                <strong>{upload.originalName}</strong>
                <div className={styles.meta}>{upload.contentType || "unknown"}</div>
                <div className={styles.meta}>{upload.publicUrl}</div>
              </div>
              <button className={styles.pick} type="button" onClick={() => pick(upload.publicUrl)}>
                Use URL
              </button>
            </div>
          ))
        ) : (
          <div className={styles.meta}>No uploads found in this category yet.</div>
        )}
      </div>
    </div>
  );
}
