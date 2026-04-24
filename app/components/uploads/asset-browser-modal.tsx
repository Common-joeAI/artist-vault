"use client";

import { useEffect, useMemo, useState } from "react";

type UploadRecord = {
  id: string;
  originalName: string;
  publicUrl: string;
  category: "press" | "covers" | "masters" | "previews" | "misc";
  contentType: string;
};

type AssetBrowserModalProps = {
  inputId: string;
  defaultCategory?: UploadRecord["category"];
  label?: string;
};

const categories = ["press", "covers", "masters", "previews", "misc"] as const;

export function AssetBrowserModal({ inputId, defaultCategory = "misc", label = "Browse assets" }: AssetBrowserModalProps) {
  const [open, setOpen] = useState(false);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [category, setCategory] = useState<UploadRecord["category"]>(defaultCategory);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function loadUploads() {
    const response = await fetch("/api/uploads");
    const payload = (await response.json()) as { uploads?: UploadRecord[] };
    setUploads(payload.uploads ?? []);
  }

  useEffect(() => {
    if (open) {
      void loadUploads();
    }
  }, [open]);

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return uploads.filter((upload) => {
      if (upload.category !== category) return false;
      if (!lowered) return true;
      return upload.originalName.toLowerCase().includes(lowered) || upload.publicUrl.toLowerCase().includes(lowered);
    });
  }, [uploads, category, query]);

  function pick(url: string) {
    const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!input) {
      setStatus("Target field not found.");
      return;
    }
    input.value = url;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    setOpen(false);
    setStatus("Asset URL applied.");
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} style={{ border: 0, borderRadius: 12, background: "rgba(255,255,255,0.08)", color: "white", padding: "0.7rem 0.9rem", fontWeight: 700, cursor: "pointer" }}>
        {label}
      </button>
      {status ? <div style={{ color: "#aab3c2", fontSize: "0.9rem", marginTop: "0.4rem" }}>{status}</div> : null}
      {open ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 1000 }}>
          <div style={{ width: "min(980px, 100%)", maxHeight: "88vh", overflow: "auto", borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", background: "#0f1018", padding: "1rem", display: "grid", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <select value={category} onChange={(event) => setCategory(event.target.value as UploadRecord["category"])} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)", color: "#f4f7fb", padding: "0.75rem 0.9rem" }}>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search uploads" style={{ minWidth: 220, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)", color: "#f4f7fb", padding: "0.75rem 0.9rem" }} />
              <button type="button" onClick={() => setOpen(false)} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)", color: "#f4f7fb", padding: "0.75rem 0.9rem", fontWeight: 700, cursor: "pointer" }}>Close</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.9rem" }}>
              {filtered.length ? filtered.map((upload) => (
                <div key={upload.id} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "0.9rem", display: "grid", gap: "0.6rem" }}>
                  {upload.contentType.startsWith("image/") ? <img src={upload.publicUrl} alt={upload.originalName} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 12, background: "rgba(255,255,255,0.05)" }} /> : <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "grid", placeItems: "center", color: "#aab3c2" }}>{upload.category}</div>}
                  <strong>{upload.originalName}</strong>
                  <div style={{ color: "#aab3c2", fontSize: "0.9rem", lineHeight: 1.45, wordBreak: "break-word" }}>{upload.publicUrl}</div>
                  <button type="button" onClick={() => pick(upload.publicUrl)} style={{ border: 0, borderRadius: 12, background: "#7c3aed", color: "white", padding: "0.7rem 0.9rem", fontWeight: 700, cursor: "pointer" }}>Use asset</button>
                </div>
              )) : <div style={{ color: "#aab3c2" }}>No uploads found in this category.</div>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
