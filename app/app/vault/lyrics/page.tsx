"use client";
import { useState, useEffect } from "react";

type Release = { id: string; title: string; releaseType: string; tracks: Track[] };
type Track   = { id: string; title: string; isrc: string | null; lyrics?: string | null };

const s: Record<string, any> = {
  page:    { maxWidth: 860, margin: "0 auto", padding: "2rem 1rem" },
  h1:      { fontSize: "1.6rem", fontWeight: 800, margin: 0 },
  sub:     { color: "#9ca3af", marginTop: "0.4rem", marginBottom: "2rem" },
  card:    { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "1.5rem", background: "rgba(255,255,255,0.02)", marginBottom: "1rem" },
  label:   { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6, marginTop: 14 },
  select:  { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: "0.9rem", boxSizing: "border-box" as const },
  textarea:{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: "0.9rem", boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: 80 },
  btn:     { width: "100%", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", marginTop: "1.25rem" },
  btnSm:   { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 14px", fontSize: "0.8rem", cursor: "pointer", color: "#d1d5db" },
  sourceBadge: (src: string): React.CSSProperties => ({
    display: "inline-block", borderRadius: 20, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 700,
    background: src === "genius" ? "#facc1522" : src === "vault" ? "#34d39922" : src === "whisper" ? "#60a5fa22" : "#f8711422",
    color:      src === "genius" ? "#facc15"   : src === "vault" ? "#34d399"   : src === "whisper" ? "#60a5fa"   : "#f87114",
  }),
  lyricsBox: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.25rem", fontFamily: "monospace", fontSize: "0.88rem", lineHeight: 1.8, color: "#e5e7eb", whiteSpace: "pre-wrap" as const, maxHeight: 520, overflowY: "auto" as const },
};

const SOURCE_LABELS: Record<string, string> = {
  genius:       "🎤 Genius — authoritative source",
  vault:        "🗄️ Vault — user-entered",
  whisper:      "🎙️ Whisper — transcribed from your audio",
  ai_generated: "🤖 Groq — AI written (no source found)",
};

export default function LyricsPage() {
  const [releases, setReleases]       = useState<Release[]>([]);
  const [selRelease, setSelRelease]   = useState("");
  const [selTrack, setSelTrack]       = useState("");
  const [context, setContext]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [lyrics, setLyrics]           = useState("");
  const [source, setSource]           = useState("");
  const [saved, setSaved]             = useState(false);
  const [editing, setEditing]         = useState(false);
  const [editVal, setEditVal]         = useState("");
  const [saving, setSaving]           = useState(false);
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    fetch("/api/vault/releases-with-tracks")
      .then(r => r.json())
      .then(d => { setReleases(d.releases ?? []); setLoadingList(false); })
      .catch(() => setLoadingList(false));
  }, []);

  const currentRelease = releases.find(r => r.id === selRelease);
  const tracks = currentRelease?.tracks ?? [];
  const currentTrack = tracks.find(t => t.id === selTrack) ?? tracks[0];

  // Auto-load vault lyrics when track selected
  useEffect(() => {
    if (!currentTrack) { setLyrics(""); setSource(""); return; }
    if (currentTrack.lyrics) {
      setLyrics(currentTrack.lyrics);
      setSource("vault");
      setSaved(false);
    } else {
      setLyrics("");
      setSource("");
    }
  }, [selTrack, selRelease]);

  async function fetchLyrics(forceGenerate = false) {
    if (!selRelease) return;
    setLoading(true);
    setLyrics(""); setSource(""); setSaved(false);
    const res = await fetch("/api/vault/lyrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        releaseId: selRelease,
        trackId: selTrack || undefined,
        additionalContext: context,
        forceGenerate,
      }),
    });
    const data = await res.json();
    if (data.lyrics) {
      setLyrics(data.lyrics);
      setSource(data.source);
      setSaved(data.saved);
    }
    setLoading(false);
  }

  async function saveEdits() {
    if (!currentTrack) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/vault/tracks/${currentTrack.id}/lyrics`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lyrics: editVal }),
      });
      if (res.ok) {
        setLyrics(editVal);
        setSource("vault");
        setSaved(true);
      }
    } catch {
      // silently keep editing state
    } finally {
      setEditing(false);
      setSaving(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(lyrics).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>📝 Lyrics Manager</h1>
      <p style={s.sub}>
        Priority: 🎤 Genius (authoritative) → 🗄️ Vault (user-entered) → 🎙️ Whisper transcription (from your stored master audio) → 🤖 Groq write (last resort, clearly labeled). All lyrics saved to vault.
      </p>

      <div style={s.card}>
        <label style={s.label}>Select Release *</label>
        {loadingList ? (
          <div style={{ color: "#6b7280" }}>Loading vault...</div>
        ) : (
          <select style={s.select} value={selRelease} onChange={e => { setSelRelease(e.target.value); setSelTrack(""); setLyrics(""); setSource(""); }}>
            <option value="">— Choose a release —</option>
            {releases.map(r => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.releaseType}){r.tracks.some(t => !t.lyrics) ? " ⚠️ missing lyrics" : " ✅"}
              </option>
            ))}
          </select>
        )}

        {tracks.length > 1 && (
          <>
            <label style={s.label}>Select Track</label>
            <select style={s.select} value={selTrack} onChange={e => setSelTrack(e.target.value)}>
              <option value="">— First track —</option>
              {tracks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}{t.lyrics ? " ✅" : " ⚠️ no lyrics"}
                </option>
              ))}
            </select>
          </>
        )}

        <label style={s.label}>Style Direction (optional — helps Groq if no lyrics found)</label>
        <textarea
          style={s.textarea}
          placeholder="e.g. 'Dark trap energy, themes of resilience and late nights, minimal 808s'"
          value={context}
          onChange={e => setContext(e.target.value)}
        />

        <div style={{ display: "flex", gap: 8, marginTop: "1.25rem" }}>
          <button style={{ ...s.btn, margin: 0, flex: 1 }} onClick={() => fetchLyrics(false)} disabled={loading || !selRelease}>
            {loading ? "🔍 Searching Genius → Vault → Groq..." : "🎤 Get Lyrics"}
          </button>
          {lyrics && (
            <button style={{ ...s.btn, margin: 0, flex: "0 0 auto", width: "auto", padding: "14px 20px", background: "rgba(124,58,237,0.3)" }} onClick={() => fetchLyrics(true)} disabled={loading} title="Skip Genius/vault — generate fresh with Groq">
              🤖 Regenerate
            </button>
          )}
        </div>
      </div>

      {lyrics && (
        <div style={{ border: "1px solid rgba(124,58,237,0.35)", borderRadius: 16, padding: "1.5rem", background: "rgba(124,58,237,0.04)", marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" as const, gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
              <span style={s.sourceBadge(source)}>{SOURCE_LABELS[source] ?? source}</span>
              {saved && <span style={{ fontSize: "0.75rem", color: "#34d399" }}>✅ Saved to vault</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={s.btnSm} onClick={handleCopy}>{copied ? "✅ Copied" : "📋 Copy"}</button>
              <button style={s.btnSm} onClick={() => { setEditing(!editing); setEditVal(lyrics); }}>
                {editing ? "Cancel" : "✏️ Edit"}
              </button>
            </div>
          </div>

          {editing ? (
            <>
              <textarea
                style={{ ...s.textarea, minHeight: 400, fontFamily: "monospace", fontSize: "0.88rem", lineHeight: 1.8 }}
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
              />
              <button style={{ ...s.btn, marginTop: 8 }} onClick={saveEdits} disabled={saving}>
                {saving ? "Saving..." : "💾 Save to Vault"}
              </button>
            </>
          ) : (
            <div style={s.lyricsBox}>{lyrics}</div>
          )}
        </div>
      )}

      {/* Missing lyrics overview */}
      {releases.length > 0 && (
        <div style={{ ...s.card, marginTop: "2rem" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.75rem", color: "#9ca3af", fontSize: "0.85rem", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Lyrics Status Across Vault</div>
          {releases.map(r => (
            <div key={r.id} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                {r.tracks.map(t => (
                  <span key={t.id} style={{
                    borderRadius: 8, padding: "3px 10px", fontSize: "0.78rem",
                    background: t.lyrics ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                    color: t.lyrics ? "#34d399" : "#f87171",
                    cursor: "pointer",
                  }} onClick={() => { setSelRelease(r.id); setSelTrack(t.id); }}>
                    {t.lyrics ? "✅" : "⚠️"} {t.title}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
