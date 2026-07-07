"use client";

import { useRef, useState } from "react";

interface ImportResult {
  ok: boolean;
  totalRows?: number;
  uniqueSongs?: number;
  imported?: number;
  skipped?: number;
  errors?: string[];
  error?: string;
}

export default function DistroKidTsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.name.match(/\.(tsv|csv|txt|dat)$/i) && !f.type.includes("text") && f.type !== "") {
      setResult({ ok: false, error: "Please upload a .tsv or .csv file from DistroKid" });
      return;
    }
    setFile(f);
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/distrokid/tsv", { method: "POST", body: form });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: "Upload failed — check your connection and try again" });
    } finally {
      setLoading(false);
    }
  }

  const card: React.CSSProperties = {
    background: "rgba(124,58,237,0.08)",
    border: "1px solid rgba(124,58,237,0.3)",
    borderRadius: 16,
    padding: 28,
  };

  const dropzone: React.CSSProperties = {
    border: `2px dashed ${dragging ? "#7c3aed" : "rgba(255,255,255,0.18)"}`,
    borderRadius: 12,
    padding: "36px 24px",
    textAlign: "center",
    cursor: "pointer",
    background: dragging ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.02)",
    transition: "all 0.2s",
    marginTop: 16,
  };

  const btn: React.CSSProperties = {
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 24px",
    fontWeight: 700,
    fontSize: 15,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
    marginTop: 16,
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>📥</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#a78bfa", textTransform: "uppercase" }}>
          DistroKid TSV Import
        </span>
      </div>
      <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>
        Import Your DistroKid Earnings Report
      </h2>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.5 }}>
        Download your earnings TSV from DistroKid (Bank → download full report) and drop it here.
        We{"'"}ll parse every row, aggregate streams & earnings per song, and add them to your vault automatically.
      </p>

      <div
        style={dropzone}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="text/tab-separated-values,text/csv,text/plain,*/*"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {file ? (
          <div>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
            <div style={{ fontWeight: 700 }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} KB — click to change
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
            <div style={{ fontWeight: 600 }}>Drop your DistroKid TSV here</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
              or click to browse
            </div>
          </div>
        )}
      </div>

      {file && !result && (
        <div style={{ marginTop: 4 }}>
          <button style={btn} onClick={handleUpload} disabled={loading}>
            {loading ? "⏳ Importing…" : "🚀 Import to Vault"}
          </button>
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 16,
          padding: "16px 20px",
          borderRadius: 12,
          background: result.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${result.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          {result.ok ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#4ade80", marginBottom: 8 }}>
                ✅ Import complete!
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                {[
                  ["Rows parsed", result.totalRows],
                  ["Unique songs", result.uniqueSongs],
                  ["Added to vault", result.imported],
                  ["Updated/skipped", result.skipped],
                ].map(([label, val]) => (
                  <div key={String(label)} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 6px" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{val}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
              {result.errors && result.errors.length > 0 && (
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    {result.errors.length} row error(s)
                  </summary>
                  <ul style={{ fontSize: 12, color: "#f87171", marginTop: 6, paddingLeft: 16 }}>
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
              <button
                style={{ ...btn, marginTop: 12, background: "rgba(124,58,237,0.4)", fontSize: 13, padding: "8px 16px" }}
                onClick={() => { setFile(null); setResult(null); }}
              >
                Import another file
              </button>
            </>
          ) : (
            <div style={{ color: "#f87171", fontWeight: 600 }}>
              ❌ {result.error}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
        <strong style={{ color: "rgba(255,255,255,0.5)" }}>How to get the file:</strong> DistroKid → Bank → scroll to bottom → &quot;Download full report&quot; → save the .tsv file
      </div>
    </div>
  );
}
