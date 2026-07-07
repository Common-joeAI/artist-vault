"use client";

import { useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const DISTRIBUTOR_INFO: Record<string, { name: string; logo: string; color: string; columns: string[] }> = {
  soundon:       { name: "SoundOn",       logo: "🎶", color: "#ff4d4f", columns: ["Track Name","Release Name","UPC","ISRC","Release Date","Status"] },
  tunecore:      { name: "TuneCore",      logo: "🎸", color: "#f5a623", columns: ["Title","Artist","UPC","ISRC","Release Date","Stores","Type"] },
  cdbaby:        { name: "CD Baby",       logo: "🍼", color: "#52c41a", columns: ["Title","Artist","UPC","ISRC","Release Date","Genre","Label"] },
  amuse:         { name: "Amuse",         logo: "🎤", color: "#722ed1", columns: ["Title","UPC","ISRC","Release Date","Status","Stores"] },
  unitedmasters: { name: "United Masters",logo: "🏆", color: "#1677ff", columns: ["Track Title","Album","UPC","ISRC","Release Date"] },
  onerpm:        { name: "ONErpm",        logo: "🎼", color: "#eb2f96", columns: ["Title","Artist","UPC","ISRC","Release Date","Territory"] },
  symphonic:     { name: "Symphonic",     logo: "🎻", color: "#13c2c2", columns: ["Release Title","Artist","UPC","ISRC","Release Date","Label"] },
};

const s: Record<string, any> = {
  page: { maxWidth: 640, margin: "0 auto", padding: "2rem 1rem", fontFamily: "inherit" } as React.CSSProperties,
  back: { color: "#6b7280", fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: "1.5rem" } as React.CSSProperties,
  heading: { fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.25rem" } as React.CSSProperties,
  sub: { color: "#9ca3af", marginBottom: "2rem", fontSize: "0.9rem" } as React.CSSProperties,
  box: { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "1.5rem", background: "rgba(255,255,255,0.03)", marginBottom: "1.5rem" } as React.CSSProperties,
  label: { fontSize: "0.8rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "0.5rem" } as React.CSSProperties,
  colList: { display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 8 } as React.CSSProperties,
  col: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "3px 10px", fontSize: "0.78rem", color: "#d1d5db" } as React.CSSProperties,
  drop: (dragging: boolean, color: string): React.CSSProperties => ({
    border: `2px dashed ${dragging ? color : "rgba(255,255,255,0.15)"}`,
    borderRadius: 14,
    padding: "2.5rem 1.5rem",
    textAlign: "center",
    cursor: "pointer",
    background: dragging ? `${color}10` : "transparent",
    transition: "all 0.15s",
    marginBottom: "1rem",
  }),
  dropIcon: { fontSize: "2.5rem", marginBottom: "0.5rem" } as React.CSSProperties,
  dropText: { color: "#9ca3af", fontSize: "0.9rem" } as React.CSSProperties,
  fileChip: { display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px", fontSize: "0.85rem", color: "#d1d5db", marginBottom: "1rem" } as React.CSSProperties,
  clearBtn: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1rem", padding: 0 } as React.CSSProperties,
  btn: (color: string, disabled: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "12px 20px",
    background: disabled ? "rgba(255,255,255,0.05)" : color,
    color: disabled ? "#6b7280" : "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: "1rem",
    cursor: disabled ? "not-allowed" : "pointer",
  }),
  resultBox: (ok: boolean): React.CSSProperties => ({
    border: `1px solid ${ok ? "rgba(82,196,26,0.4)" : "rgba(255,77,79,0.4)"}`,
    borderRadius: 12,
    padding: "1.25rem",
    background: ok ? "rgba(82,196,26,0.07)" : "rgba(255,77,79,0.07)",
  }),
  resultTitle: (ok: boolean): React.CSSProperties => ({
    fontWeight: 700, fontSize: "1rem", color: ok ? "#95de64" : "#ff7875", marginBottom: "0.5rem",
  }),
  stat: { fontSize: "0.85rem", color: "#d1d5db", marginBottom: "0.25rem" } as React.CSSProperties,
  errItem: { fontSize: "0.8rem", color: "#ff7875", marginBottom: "0.2rem" } as React.CSSProperties,
};

export default function CSVImportPage() {
  const params = useParams();
  const router = useRouter();
  const distId = (params?.distributor as string ?? "").toLowerCase();
  const info = DISTRIBUTOR_INFO[distId];

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".tsv") || f.type.includes("text"))) {
      setFile(f);
      setResult(null);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const submit = async () => {
    if (!file || !distId) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("distributor", distId);
      const res = await fetch("/api/import/csv", { method: "POST", body: fd });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (!info) {
    return (
      <div style={s.page}>
        <a href="/vault/import" style={s.back}>← Back to importers</a>
        <h1 style={s.heading}>Unknown distributor</h1>
      </div>
    );
  }

  const color = info.color;

  return (
    <div style={s.page}>
      <a href="/vault/import" style={s.back}>← Back to importers</a>
      <h1 style={s.heading}>{info.logo} {info.name} Import</h1>
      <p style={s.sub}>Upload your CSV export from {info.name} to import your catalog.</p>

      {/* Expected columns */}
      <div style={s.box}>
        <div style={s.label}>Expected columns in your CSV</div>
        <div style={s.colList}>
          {info.columns.map((c) => <span key={c} style={s.col}>{c}</span>)}
        </div>
        <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.75rem", marginBottom: 0 }}>
          Column names don't need to match exactly — we handle variations automatically.
        </p>
      </div>

      {/* Drop zone */}
      {!file ? (
        <div
          style={s.drop(dragging, color)}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div style={s.dropIcon}>📄</div>
          <div style={s.dropText}>Drag & drop your CSV here, or <span style={{ color, fontWeight: 700 }}>click to browse</span></div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.4rem" }}>Supports .csv and .tsv files</div>
          <input ref={fileRef} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain,*/*" style={{ display: "none" }} onChange={onFileChange} />
        </div>
      ) : (
        <div style={s.fileChip}>
          📄 {file.name} <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>({(file.size / 1024).toFixed(1)} KB)</span>
          <button style={s.clearBtn} onClick={() => setFile(null)}>✕</button>
        </div>
      )}

      {/* Import button */}
      <button style={s.btn(color, !file || loading)} disabled={!file || loading} onClick={submit}>
        {loading ? "⏳ Importing..." : `⬆️ Import ${info.name} Catalog`}
      </button>

      {/* Result */}
      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          {result.error ? (
            <div style={s.resultBox(false)}>
              <div style={s.resultTitle(false)}>❌ Import failed</div>
              <div style={s.errItem}>{result.error}</div>
            </div>
          ) : (
            <div style={s.resultBox(true)}>
              <div style={s.resultTitle(true)}>✅ Import complete</div>
              <div style={s.stat}>📄 Rows parsed: <strong>{result.rowsParsed ?? result.releases ?? "—"}</strong></div>
              <div style={s.stat}>📦 Release groups: <strong>{result.releaseGroups ?? result.releases ?? "—"}</strong></div>
              <div style={s.stat}>✨ Releases created: <strong>{result.releasesCreated ?? result.created ?? "—"}</strong></div>
              {(result.releasesUpdated ?? 0) > 0 && <div style={s.stat}>🔄 Releases updated: <strong>{result.releasesUpdated}</strong></div>}
              <div style={s.stat}>🎵 Tracks added: <strong>{result.tracksCreated ?? "—"}</strong></div>
              {(result.tracksUpdated ?? 0) > 0 && <div style={s.stat}>🔄 Tracks updated: <strong>{result.tracksUpdated}</strong></div>}
              {result.errors?.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  {result.errors.map((e: string, i: number) => <div key={i} style={s.errItem}>• {e}</div>)}
                </div>
              )}
              <div style={{ marginTop: "1rem", display: "flex", gap: 12 }}>
                <a href="/vault" style={{ color, fontWeight: 700, fontSize: "0.9rem" }}>→ Go to your Vault</a>
                <button style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.9rem" }} onClick={() => { setFile(null); setResult(null); }}>Import another</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

