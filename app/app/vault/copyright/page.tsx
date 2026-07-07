"use client";
import { useState, useEffect } from "react";

type Release = { id: string; title: string; releaseType: string; tracks: Track[] };
type Track   = { id: string; title: string; isrc: string | null; lyrics?: string | null };

const s: Record<string, any> = {
  page:     { maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" },
  h1:       { fontSize: "1.6rem", fontWeight: 800, margin: 0 },
  sub:      { color: "#9ca3af", marginTop: "0.4rem", marginBottom: "2rem" },
  card:     { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "1.5rem", background: "rgba(255,255,255,0.02)", marginBottom: "1.25rem" },
  label:    { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6, marginTop: 14 },
  select:   { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: "0.9rem", boxSizing: "border-box" as const },
  btn:      { width: "100%", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", marginTop: "1.25rem" },
  btnSm:    { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 16px", fontSize: "0.85rem", cursor: "pointer", color: "#e5e7eb", fontWeight: 600 },
  btnGreen: { background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 8, padding: "8px 16px", fontSize: "0.85rem", cursor: "pointer", color: "#34d399", fontWeight: 600 },
  field:    { marginBottom: "0.75rem" },
  fLabel:   { fontSize: "0.72rem", color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 2 },
  fValue:   { fontSize: "0.9rem", color: "#e5e7eb", wordBreak: "break-word" as const },
  note:     { fontSize: "0.82rem", color: "#9ca3af", padding: "6px 0 6px 12px", borderLeft: "2px solid rgba(124,58,237,0.4)", marginBottom: 6 },
  textarea: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#e5e7eb", fontSize: "0.85rem", fontFamily: "monospace", lineHeight: 1.8, boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: 200 },
  tab:      (active: boolean): React.CSSProperties => ({
    padding: "8px 18px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", border: "none",
    background: active ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.05)",
    color: active ? "#a78bfa" : "#9ca3af",
  }),
  warn:     { background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", color: "#fbbf24", marginBottom: "1rem" },
  proBadge: (pro: string): React.CSSProperties => ({
    display: "inline-block", borderRadius: 20, padding: "3px 14px", fontSize: "0.78rem", fontWeight: 800,
    background: pro === "ASCAP" ? "rgba(99,102,241,0.2)" : "rgba(239,68,68,0.15)",
    color:      pro === "ASCAP" ? "#818cf8"              : "#f87171",
    marginLeft: 8,
  }),
};

export default function CopyrightPage() {
  const [releases, setReleases]       = useState<Release[]>([]);
  const [selRelease, setSelRelease]   = useState("");
  const [selTrack, setSelTrack]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [data, setData]               = useState<any>(null);
  const [activeTab, setActiveTab]     = useState(0);
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    fetch("/api/vault/releases-with-tracks")
      .then(r => r.json())
      .then(d => { setReleases(d.releases ?? []); setLoadingList(false); })
      .catch(() => setLoadingList(false));
  }, []);

  const currentRelease = releases.find(r => r.id === selRelease);
  const tracks = currentRelease?.tracks ?? [];

  // Build tabs based on user's PRO selection
  const proOrg: string | null = data?.proOrg ?? null;
  const TABS = [
    { key: "copyright", label: "📋 Copyright (US)" },
    ...(proOrg === "ASCAP" ? [{ key: "ascap", label: "🎵 ASCAP" }] : []),
    ...(proOrg === "BMI"   ? [{ key: "bmi",   label: "🎸 BMI" }]   : []),
    ...(!proOrg            ? [{ key: "ascap", label: "🎵 ASCAP" }, { key: "bmi", label: "🎸 BMI" }] : []),
    { key: "genius", label: "🧠 Genius" },
  ];

  async function generate() {
    if (!selRelease) return;
    setLoading(true); setData(null); setActiveTab(0);
    const res = await fetch("/api/vault/copyright", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ releaseId: selRelease, trackId: selTrack || undefined }),
    });
    const d = await res.json();
    setData(d);
    setLoading(false);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function Field({ label, value }: { label: string; value: string }) {
    return (
      <div style={s.field}>
        <div style={s.fLabel}>{label}</div>
        <div style={s.fValue}>{value || "—"}</div>
      </div>
    );
  }

  const tab = TABS[activeTab]?.key ?? "copyright";

  return (
    <div style={s.page}>
      <h1 style={s.h1}>
        ⚖️ Copyright & Register
        {data?.proOrg && <span style={s.proBadge(data.proOrg)}>{data.proOrg} Member</span>}
        {data && !data.proOrg && <span style={{ ...s.proBadge(""), background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>No PRO selected</span>}
      </h1>
      <p style={s.sub}>
        Auto-generates your copyright filing, PRO work registration, and Genius submission from your vault data.
      </p>

      <div style={s.card}>
        <label style={s.label}>Select Release *</label>
        {loadingList ? <div style={{ color: "#6b7280" }}>Loading vault...</div> : (
          <select style={s.select} value={selRelease} onChange={e => { setSelRelease(e.target.value); setSelTrack(""); setData(null); }}>
            <option value="">— Choose a release —</option>
            {releases.map(r => (
              <option key={r.id} value={r.id}>{r.title} ({r.releaseType})</option>
            ))}
          </select>
        )}
        {tracks.length > 1 && (
          <>
            <label style={s.label}>Select Track (optional — defaults to first)</label>
            <select style={s.select} value={selTrack} onChange={e => setSelTrack(e.target.value)}>
              <option value="">— First track —</option>
              {tracks.map(t => <option key={t.id} value={t.id}>{t.title}{t.lyrics ? " ✅" : " ⚠️ no lyrics"}</option>)}
            </select>
          </>
        )}
        <button style={s.btn} onClick={generate} disabled={loading || !selRelease}>
          {loading ? "⚖️ Generating registration package..." : "⚖️ Generate Copyright & Registration Package"}
        </button>
      </div>

      {data && (
        <>
          {/* PRO prompt if not set */}
          {!data.proOrg && (
            <div style={s.warn}>
              ⚠️ You haven't selected a PRO (ASCAP or BMI) during onboarding. <a href="/vault/pro/registration" style={{ color: "#fbbf24" }}>Register your PRO here</a> so only the correct tab shows.
            </div>
          )}

          {!data.hasLyrics && (
            <div style={{ ...s.warn, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#f87171" }}>
              ⚠️ No lyrics found for this track. <a href="/vault/lyrics" style={{ color: "#f87171" }}>Add them in Lyrics Manager</a> for a stronger copyright filing.
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: "1.25rem" }}>
            {TABS.map((t, i) => (
              <button key={t.key} style={s.tab(activeTab === i)} onClick={() => setActiveTab(i)}>{t.label}</button>
            ))}
          </div>

          {/* US Copyright */}
          {tab === "copyright" && (
            <div style={s.card}>
              <div style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1rem" }}>📋 US Copyright Office — Form {data.copyright.formType}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1.5rem" }}>
                <Field label="Title" value={data.copyright.title} />
                <Field label="Form Type" value={data.copyright.formType} />
                <Field label="Year Completed" value={String(data.copyright.yearCompleted)} />
                <Field label="Author Name" value={data.copyright.authorName} />
                <Field label="Author Nationality" value={data.copyright.authorNationality} />
                <Field label="Work Made for Hire" value={data.copyright.workMadeForHire} />
                <Field label="Copyright Claimant" value={data.copyright.copyrightClaimant} />
              </div>
              {data.copyright.description && (
                <>
                  <label style={s.label}>Description for Form</label>
                  <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", lineHeight: 1.6, color: "#e5e7eb" }}>
                    {data.copyright.description}
                  </div>
                </>
              )}
              <label style={s.label}>Filing Notes</label>
              {data.copyright.notes.map((n: string, i: number) => <div key={i} style={s.note}>{n}</div>)}
              <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
                <a href={data.copyright.submissionUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", flex: 1 }}>
                  <button style={{ ...s.btnGreen, width: "100%" }}>🌐 Open eCO Filing Portal</button>
                </a>
                <button style={s.btnSm} onClick={() => copyText(`Title: ${data.copyright.title}\nAuthor: ${data.copyright.authorName}\nYear: ${data.copyright.yearCompleted}\nDescription: ${data.copyright.description}`)}>
                  {copied ? "✅" : "📋 Copy"}
                </button>
              </div>
            </div>
          )}

          {/* ASCAP */}
          {tab === "ascap" && (
            <div style={s.card}>
              <div style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1rem" }}>🎵 ASCAP Work Registration</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1.5rem" }}>
                <Field label="Title" value={data.ascap.title} />
                <Field label="ISRC" value={data.ascap.isrc || "Not set — add in vault"} />
                <Field label="Release Date" value={data.ascap.releaseDate} />
                <Field label="Genre" value={data.ascap.genre} />
              </div>
              <label style={s.label}>Writers & Shares</label>
              {data.ascap.writers.map((w: any, i: number) => (
                <div key={i} style={{ background: "rgba(99,102,241,0.08)", borderRadius: 8, padding: "10px 14px", marginBottom: 6, fontSize: "0.88rem" }}>
                  <strong>{w.name}</strong> — {w.role} · <span style={{ color: "#818cf8" }}>{w.pro}</span> · {w.share}
                </div>
              ))}
              <label style={s.label}>Registration Notes</label>
              {data.ascap.notes.map((n: string, i: number) => <div key={i} style={s.note}>{n}</div>)}
              <a href={data.ascap.registrationUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block", marginTop: "1rem" }}>
                <button style={{ ...s.btnGreen, width: "100%" }}>🌐 Open ASCAP Member Portal</button>
              </a>
            </div>
          )}

          {/* BMI */}
          {tab === "bmi" && (
            <div style={s.card}>
              <div style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1rem" }}>🎸 BMI SongFile Registration</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1.5rem" }}>
                <Field label="Title" value={data.bmi.title} />
                <Field label="ISRC" value={data.bmi.isrc || "Not set"} />
                <Field label="Release Date" value={data.bmi.releaseDate} />
                <Field label="Genre" value={data.bmi.genre} />
              </div>
              <label style={s.label}>Writers & Shares</label>
              {data.bmi.writers.map((w: any, i: number) => (
                <div key={i} style={{ background: "rgba(239,68,68,0.07)", borderRadius: 8, padding: "10px 14px", marginBottom: 6, fontSize: "0.88rem" }}>
                  <strong>{w.name}</strong> — {w.role} · <span style={{ color: "#f87171" }}>BMI</span> · {w.share}
                </div>
              ))}
              <label style={s.label}>Registration Notes</label>
              {data.bmi.notes.map((n: string, i: number) => <div key={i} style={s.note}>{n}</div>)}
              <a href={data.bmi.registrationUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block", marginTop: "1rem" }}>
                <button style={{ ...s.btnGreen, width: "100%" }}>🌐 Open BMI SongFile</button>
              </a>
            </div>
          )}

          {/* Genius */}
          {tab === "genius" && (
            <div style={s.card}>
              <div style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1rem" }}>🧠 Genius Song Submission</div>
              <Field label="Song Title" value={data.genius.songTitle} />
              <Field label="Primary Artist" value={data.genius.primaryArtist} />
              <Field label="Release Date" value={data.genius.releaseDate} />
              <label style={s.label}>Step-by-Step</label>
              {data.genius.instructions.map((n: string, i: number) => <div key={i} style={s.note}>{n}</div>)}
              <label style={s.label}>Lyrics — Copy & Paste into Genius Editor</label>
              <textarea style={s.textarea} value={data.genius.lyricsFormatted} readOnly />
              <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
                <a href={data.genius.submissionUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", flex: 1 }}>
                  <button style={{ ...s.btnGreen, width: "100%" }}>🌐 Open Genius Submission</button>
                </a>
                <button style={s.btnSm} onClick={() => copyText(data.genius.lyricsFormatted)}>
                  {copied ? "✅ Copied" : "📋 Copy Lyrics"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
