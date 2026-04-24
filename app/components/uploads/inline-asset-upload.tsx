"use client";

import { useMemo, useState } from "react";
import styles from "./inline-asset-upload.module.css";

type UploadCategory = "press" | "covers" | "masters" | "previews" | "misc";

type UploadRecord = {
  id: string;
  originalName: string;
  publicUrl: string;
  category: UploadCategory;
  contentType: string;
};

type InlineAssetUploadProps = {
  inputId: string;
  defaultCategory: UploadCategory;
  title?: string;
  helpText?: string;
  buttonLabel?: string;
};

export function InlineAssetUpload({
  inputId,
  defaultCategory,
  title = "Upload asset",
  helpText,
  buttonLabel = "Upload and use URL",
}: InlineAssetUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const accept = useMemo(() => {
    if (defaultCategory === "masters" || defaultCategory === "previews") {
      return "audio/*";
    }
    return "image/*";
  }, [defaultCategory]);

  function applyUrl(url: string) {
    const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!input) {
      setError("Target field not found.");
      return;
    }

    input.value = url;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

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
      formData.append("category", defaultCategory);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { error?: string; upload?: UploadRecord };

      if (!response.ok || !payload.upload) {
        setError(payload.error ?? "Upload failed.");
        return;
      }

      applyUrl(payload.upload.publicUrl);
      setStatus(`Uploaded ${payload.upload.originalName} and filled the field.`);
      setFile(null);
      const input = document.getElementById(`${inputId}-inline-upload`) as HTMLInputElement | null;
      if (input) input.value = "";
    } catch {
      setError("A network or server error occurred during upload.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <strong>{title}</strong>
        {helpText ? <div className={styles.help}>{helpText}</div> : null}
      </div>

      <div className={styles.row}>
        <input id={`${inputId}-inline-upload`} className={styles.input} type="file" accept={accept} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button className={styles.button} type="button" onClick={upload} disabled={loading}>
          {loading ? "Uploading…" : buttonLabel}
        </button>
      </div>

      {status ? <div className={styles.success}>{status}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
    </div>
  );
}
