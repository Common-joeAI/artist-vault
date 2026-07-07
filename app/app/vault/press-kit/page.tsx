"use client";
import { useState } from "react";

const TONES = [
  { value: "editorial", label: "✍️ Editorial", desc: "Music blog style — conversational, descriptive" },
  { value: "formal",    label: "📻 Formal",    desc: "Industry/radio — professional, concise" },
  { value: "hype",      label: "🔥 Hype",      desc: "Energetic promo — bold, attention-grabbing" },
];

const s: Record<string, any> = {
  page:     { maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" },
  h1:       { fontSize: "1.6rem", fontWeight: 800, margin: 0 },
  sub:      { color: "#9ca3af", marginTop: "0.4rem", marginBottom: "2rem" },
  card:     { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "1.5rem", background: "rgba(255,255,255,0.02)", marginBottom: "1.25rem" },
  sTitle:   { fontSize: "0.75rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "1rem" },
  btn:      { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontWeight: 800, fontSize: "1rem", cursor: "pointer" },
  btnSm:    { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 16px", fontSize: "0.85rem", cursor: "pointer", color: "#e5e7eb", fontWeight: 600 },
  btnGreen: { background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 8, padding: "8px 16px", fontSize: "0.85rem", cursor: "pointer", color: "#34d399", fontWeight: 600 },
  input:    { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: "0.9rem", boxSizing: "border-box" as const },
  label:    { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6, marginTop: 14 },
  bio:      { fontSize: "0.95rem", lineHeight: 1.8, color: "#d1d5db", whiteSpace: "pre-wrap" as const },
  note:     { fontSize: "0.82rem", color: "#9ca3af", padding: "6px 0 6px 12px", borderLeft: "2px solid rgba(124,58,237,0.4)", marginBottom: 6 },
  toneCard: (active: boolean): React.CSSProperties => ({
    border: `2px solid ${active ? "#7c3aed" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 12, padding: "12px 16px", cursor: "pointer",
    background: active ? "rgba(124,58,237,0.1)" : "transparent", flex: 1,
  }),
  success: { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: "0.85rem", color: "#34d399", marginBottom: "1rem" },
  err:     { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: "0.85rem", color: "#f87171", marginBottom: "1rem" },
};

export default function PressKitStudio() {
  const [tone, setTone]             = useState("editorial");
  const [loading, setLoading]       = useState(false);
  const [data, setData]             = useState<any>(null);
  const [sendTo, setSendTo]         = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [note, setNote]             = useState("");
  const [sending, setSending]       = useState(false);
  const [testEmail, setTestEmail]   = useState("");
  const [testing, setTesting]       = useState(false);
  const [msg, setMsg]               = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function generate() {
    setLoading(true); setData(null); setMsg(null);
    const res = await fetch("/api/press-kit/generate", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ tone }),
    });
    const d = await res.json();
    if (d.error) { setMsg({ type: "error", text: d.error }); }
    else { setData(d); }
    setLoading(false);
  }

  async function sendEmail() {
    if (!sendTo) return;
    setSending(true); setMsg(null);
    const res = await fetch("/api/press-kit/send", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: sendTo, recipientName, note }),
    });
    const d = await res.json();
    setMsg(d.error
      ? { type: "error", text: d.error }
      : { type: "success", text: `✅ Press kit sent to ${sendTo}` }
    );
    setSending(false);
  }

  async function runTestEmail() {
    if (!testEmail) return;
    setTesting(true); setMsg(null);
    const res = await fetch("/api/press-kit/test-email", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: testEmail }),
    });
    const d = await res.json();
    setMsg(d.error
      ? { type: "error", text: d.error }
      : { type: "success", text: `✅ Test email sent to ${testEmail}` }
    );
    setTesting(false);
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>🎤 Press Kit Studio</h1>
      <p style={s.sub}>AI-generated press kit from your vault data. Publish a live EPK link, send to radio stations and blogs, or download as PDF.</p>

      {msg && <div style={msg.type === "success" ? s.success : s.err}>{msg.text}</div>}

      {/* Tone selector */}
      <div style={s.card}>
        <div style={s.sTitle}>Choose Bio Tone</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          {TONES.map(t => (
            <div key={t.value} style={s.toneCard(tone === t.value)} onClick={() => setTone(t.value)}>
              <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{t.label}</div>
              <div style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: 4 }}>{t.desc}</div>
            </div>
          ))}
        </div>
        <button style={{ ...s.btn, marginTop: "1.25rem", width: "100%" }} onClick={generate} disabled={loading}>
          {loading ? "⚙️ Generating from vault data..." : "⚙️ Generate Press Kit"}
        </button>
      </div>

      {data && (
        <>
          {/* Bio */}
          <div style={s.card}>
            <div style={s.sTitle}>Generated Bio</div>
            <p style={s.bio}>{data.bio}</p>
            {data.styleDna && <div style={{ ...s.note, marginTop: "1rem" }}>🧬 Style DNA: {data.styleDna}</div>}
            {data.proOrg && <div style={s.note}>🎵 PRO: {data.proOrg}</div>}
          </div>

          {/* Lyrics excerpts */}
          {data.lyricsExcerpts?.length > 0 && (
            <div style={s.card}>
              <div style={s.sTitle}>Lyrics Excerpts</div>
              {data.lyricsExcerpts.map((l: any, i: number) => (
                <div key={i} style={{ marginBottom: "1rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 6 }}>{l.title}</div>
                  <pre style={{ fontFamily: "Georgia, serif", fontSize: "0.88rem", color: "#9ca3af", lineHeight: 1.9, whiteSpace: "pre-wrap" as const }}>{l.excerpt}</pre>
                </div>
              ))}
            </div>
          )}

          {/* Streaming links */}
          {data.streamingLinks?.length > 0 && (
            <div style={s.card}>
              <div style={s.sTitle}>Streaming Links</div>
              {data.streamingLinks.map((l: string, i: number) => <div key={i} style={s.note}>{l}</div>)}
            </div>
          )}

          {/* Live EPK link */}
          <div style={s.card}>
            <div style={s.sTitle}>🌐 Live EPK Link</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const }}>
              <a href={data.epkUrl} target="_blank" rel="noreferrer" style={{ color: "#a78bfa", fontSize: "0.95rem", wordBreak: "break-all" as const }}>
                {data.epkUrl}
              </a>
              <button style={s.btnSm} onClick={() => navigator.clipboard.writeText(data.epkUrl)}>📋 Copy</button>
              <a href={data.epkUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <button style={s.btnGreen}>🔗 Open</button>
              </a>
            </div>
            <div style={{ ...s.note, marginTop: "0.75rem" }}>This page auto-updates every time you regenerate your press kit.</div>
          </div>

          {/* Send to radio/blog */}
          <div style={s.card}>
            <div style={s.sTitle}>📧 Send to Radio / Blog / Curator</div>
            <label style={s.label}>Recipient Email *</label>
            <input style={s.input} type="email" value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="editor@musicblog.com" />
            <label style={s.label}>Recipient Name (optional)</label>
            <input style={s.input} type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Sarah" />
            <label style={s.label}>Personal Note (optional)</label>
            <input style={s.input} type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="I think this would be a great fit for your playlist..." />
            <button style={{ ...s.btn, marginTop: "1rem", width: "100%" }} onClick={sendEmail} disabled={sending || !sendTo}>
              {sending ? "📨 Sending..." : "📨 Send Press Kit Email"}
            </button>
          </div>
        </>
      )}

      {/* Test email */}
      <div style={{ ...s.card, borderColor: "rgba(251,191,36,0.2)" }}>
        <div style={s.sTitle}>🧪 Test Email Setup</div>
        <div style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "0.75rem" }}>Send a test email to verify Resend is configured correctly before sending to contacts.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input style={{ ...s.input, flex: 1 }} type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" />
          <button style={s.btnSm} onClick={runTestEmail} disabled={testing || !testEmail}>
            {testing ? "Sending..." : "Send Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
