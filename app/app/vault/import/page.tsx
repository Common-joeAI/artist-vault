"use client";

import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Distributor = {
  id: string;
  name: string;
  logo: string;
  color: string;
  tier: 1 | 2;
  csvPath: string[];       // step-by-step path inside the dashboard
  csvNote?: string;
  columns: string[];       // key column names in the export
  importPath?: string;     // internal route if importer exists
};

// ─── Distributor definitions ─────────────────────────────────────────────────

const DISTRIBUTORS: Distributor[] = [
  {
    id: "distrokid",
    name: "DistroKid",
    logo: "🎵",
    color: "#00b4d8",
    tier: 1,
    csvPath: [
      "Log in to distrokid.com",
      "Go to your Artist page → click your artist name",
      "Scroll down → click \"Download a spreadsheet of your songs\"",
      "A .xlsx or .csv file will download automatically",
    ],
    csvNote: "DistroKid exports an Excel file — save it as CSV before uploading.",
    columns: ["Song Name", "Album", "UPC", "ISRC", "Release Date", "Stores"],
    importPath: "/vault/import/distrokid",
  },
  {
    id: "soundon",
    name: "SoundOn",
    logo: "🎶",
    color: "#ff4d4f",
    tier: 1,
    csvPath: [
      "Log in to soundon.tiktok.com",
      "Go to \"My Music\" from the left sidebar",
      "Click the \"Releases\" tab",
      "Look for an Export or Download icon (top right of table)",
      "Select \"Export as CSV\"",
    ],
    csvNote: "SoundOn's export feature may be limited — if unavailable, use the manual import option below.",
    columns: ["Track Name", "Release Name", "UPC", "ISRC", "Release Date", "Status"],
  },
  {
    id: "tunecore",
    name: "TuneCore",
    logo: "🎸",
    color: "#f5a623",
    tier: 1,
    csvPath: [
      "Log in to tunecore.com",
      "Go to \"Music\" → \"My Music\"",
      "Click \"Export\" or the download icon in the top-right",
      "Choose \"Export All Releases as CSV\"",
    ],
    columns: ["Title", "Artist", "UPC", "ISRC", "Release Date", "Stores", "Type"],
  },
  {
    id: "cdbaby",
    name: "CD Baby",
    logo: "🍼",
    color: "#52c41a",
    tier: 1,
    csvPath: [
      "Log in to cdbaby.com",
      "Go to \"My Music\" in the top nav",
      "Click \"Export Catalog\" from the dropdown",
      "Select CSV format and download",
    ],
    columns: ["Title", "Artist", "UPC", "ISRC", "Release Date", "Genre", "Label"],
  },
  {
    id: "amuse",
    name: "Amuse",
    logo: "🎤",
    color: "#722ed1",
    tier: 1,
    csvPath: [
      "Log in to amuse.io",
      "Go to \"Releases\" in the sidebar",
      "Click the \"...\" menu next to any release → \"Export Data\"",
      "Download the CSV file",
    ],
    csvNote: "Amuse exports per-release. Download one per release and import separately.",
    columns: ["Title", "UPC", "ISRC", "Release Date", "Status", "Stores"],
  },
  {
    id: "unitedmasters",
    name: "United Masters",
    logo: "🏆",
    color: "#1677ff",
    tier: 2,
    csvPath: [
      "Log in to unitedmasters.com",
      "Go to \"Catalog\" in the left menu",
      "Click \"Export\" (top right)",
      "Download as CSV",
    ],
    columns: ["Track Title", "Album", "UPC", "ISRC", "Release Date"],
  },
  {
    id: "onerpm",
    name: "ONErpm",
    logo: "🎼",
    color: "#eb2f96",
    tier: 2,
    csvPath: [
      "Log in to onerpm.com",
      "Go to \"Music\" → \"Releases\"",
      "Click \"Export\" in the toolbar",
      "Download CSV",
    ],
    columns: ["Title", "Artist", "UPC", "ISRC", "Release Date", "Territory"],
  },
  {
    id: "symphonic",
    name: "Symphonic",
    logo: "🎻",
    color: "#13c2c2",
    tier: 2,
    csvPath: [
      "Log in to symphonicms.com",
      "Go to \"Releases\" in the top nav",
      "Click \"Export Releases\" button",
      "Download CSV",
    ],
    columns: ["Release Title", "Artist", "UPC", "ISRC", "Release Date", "Label"],
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "2rem 1rem",
    fontFamily: "inherit",
  } as React.CSSProperties,
  heading: {
    fontSize: "1.6rem",
    fontWeight: 800,
    margin: 0,
  } as React.CSSProperties,
  sub: {
    color: "#9ca3af",
    marginTop: "0.4rem",
    marginBottom: "2rem",
  } as React.CSSProperties,
  sectionLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "#6b7280",
    marginBottom: "0.75rem",
    marginTop: "1.5rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  } as React.CSSProperties,
  card: (active: boolean, color: string): React.CSSProperties => ({
    border: active ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: "1rem 1.25rem",
    background: active ? `${color}18` : "rgba(255,255,255,0.03)",
    cursor: "pointer",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    gap: 12,
  }),
  logo: {
    fontSize: "1.6rem",
    lineHeight: 1,
  } as React.CSSProperties,
  cardName: {
    fontWeight: 700,
    fontSize: "0.95rem",
  } as React.CSSProperties,
  cardTier: {
    fontSize: "0.7rem",
    color: "#6b7280",
  } as React.CSSProperties,
  panel: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: "1.75rem 2rem",
    background: "rgba(255,255,255,0.02)",
  } as React.CSSProperties,
  panelHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: "1.5rem",
  } as React.CSSProperties,
  panelTitle: {
    fontSize: "1.25rem",
    fontWeight: 800,
    margin: 0,
  } as React.CSSProperties,
  steps: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 1.25rem 0",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  step: (color: string): React.CSSProperties => ({
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  }),
  stepNum: (color: string): React.CSSProperties => ({
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: color,
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.75rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  }),
  stepText: {
    color: "#d1d5db",
    fontSize: "0.9rem",
    lineHeight: 1.5,
    paddingTop: 3,
  } as React.CSSProperties,
  note: (color: string): React.CSSProperties => ({
    background: `${color}18`,
    border: `1px solid ${color}40`,
    borderRadius: 10,
    padding: "0.75rem 1rem",
    fontSize: "0.82rem",
    color: "#d1d5db",
    marginBottom: "1.25rem",
  }),
  columns: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
    marginBottom: "1.5rem",
  },
  col: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: "0.75rem",
    fontFamily: "monospace",
    color: "#9ca3af",
  } as React.CSSProperties,
  btnRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  primaryBtn: (color: string): React.CSSProperties => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  }),
  secondaryBtn: {
    background: "rgba(255,255,255,0.07)",
    color: "#d1d5db",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    display: "inline-block",
    textDecoration: "none",
  } as React.CSSProperties,
  comingSoon: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "#6b7280",
  } as React.CSSProperties,
  uploadArea: {
    border: "2px dashed rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: "2rem",
    textAlign: "center" as const,
    color: "#6b7280",
    fontSize: "0.9rem",
    marginBottom: "1rem",
    cursor: "pointer",
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [selected, setSelected] = useState<string>("distrokid");

  const tier1 = DISTRIBUTORS.filter((d) => d.tier === 1);
  const tier2 = DISTRIBUTORS.filter((d) => d.tier === 2);
  const dist = DISTRIBUTORS.find((d) => d.id === selected)!;

  return (
    <div style={s.page}>
      <h1 style={s.heading}>📥 Import Music</h1>
      <p style={s.sub}>
        Import your catalog from any major distributor. Download your CSV export and upload it here — we'll do the rest.
      </p>

      {/* Tier 1 */}
      <div style={s.sectionLabel}>Most Popular</div>
      <div style={s.grid}>
        {tier1.map((d) => (
          <div key={d.id} style={s.card(selected === d.id, d.color)} onClick={() => setSelected(d.id)}>
            <span style={s.logo}>{d.logo}</span>
            <div>
              <div style={s.cardName}>{d.name}</div>
              <div style={s.cardTier}>Tier 1</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tier 2 */}
      <div style={s.sectionLabel}>Also Supported</div>
      <div style={s.grid}>
        {tier2.map((d) => (
          <div key={d.id} style={s.card(selected === d.id, d.color)} onClick={() => setSelected(d.id)}>
            <span style={s.logo}>{d.logo}</span>
            <div>
              <div style={s.cardName}>{d.name}</div>
              <div style={s.cardTier}>Tier 2</div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      <div style={s.panel}>
        <div style={s.panelHeader}>
          <span style={{ fontSize: "2rem" }}>{dist.logo}</span>
          <div>
            <h2 style={s.panelTitle}>{dist.name} Import</h2>
            <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>Step-by-step instructions</div>
          </div>
        </div>

        {/* Steps */}
        <div style={{ marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.85rem", color: "#9ca3af" }}>
          How to export your CSV from {dist.name}:
        </div>
        <ul style={s.steps}>
          {dist.csvPath.map((step, i) => (
            <li key={i} style={s.step(dist.color)}>
              <span style={s.stepNum(dist.color)}>{i + 1}</span>
              <span style={s.stepText}>{step}</span>
            </li>
          ))}
        </ul>

        {/* Note */}
        {dist.csvNote && (
          <div style={s.note(dist.color)}>
            ⚠️ {dist.csvNote}
          </div>
        )}

        {/* Expected columns */}
        <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#6b7280", marginBottom: 8 }}>
          Expected columns in the CSV:
        </div>
        <div style={s.columns}>
          {dist.columns.map((col) => (
            <span key={col} style={s.col}>{col}</span>
          ))}
        </div>

        {/* Actions */}
        <div style={s.btnRow}>
          {dist.importPath ? (
            <a href={dist.importPath} style={s.primaryBtn(dist.color)}>
              ⬆️ Upload {dist.name} CSV
            </a>
          ) : (
            <div style={s.comingSoon}>
              🔜 CSV Importer Coming Soon
            </div>
          )}
          <a
            href="/vault/import/manual"
            style={s.secondaryBtn}
          >
            ✏️ Manual Entry Instead
          </a>
        </div>
      </div>
    </div>
  );
}
