'use client';
import { useState, useEffect, useRef } from "react";

type Release = { id: string; title: string; releaseType: string; tracks: Track[] };
type Track = { id: string; title: string; isrc: string | null };

type VaultTrack = {
  trackId: string; trackTitle: string; releaseId: string; releaseTitle: string;
  artistName: string; isrc: string | null; enhancerStatus: string; enhancedAt: string | null;
};

type JobStatus = "pending" | "running" | "done" | "error" | "skipped";
type Job = { track: VaultTrack; status: JobStatus; message?: string };

type Enhanced = {
  title?: string; subtitle?: string; isrc?: string; upc?: string;
  genre?: string; subgenre?: string; mood?: string[]; themes?: string[];
  bpm_estimate?: number; key?: string; energy_level?: string;
  lyrics_summary?: string; description?: string; short_bio?: string;
  streaming_summary?: string; tags?: string[]; similar_artists?: string[];
  playlist_pitch?: string; press_blurb?: string; platform_links?: string[];
  release_type?: string; explicit?: boolean; vault_context_used?: boolean;
};

const s: Record<string, any> = {
  page: { maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" },
  h1: { fontSize: "1.6rem", fontWeight: 800, margin: 0 },
  sub: { color: "#9ca3af", marginTop: "0.4rem", marginBottom: "1.5rem" },
  card: { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "1.5rem", background: "rgba(255,255,255,0.02)", marginBottom: "1rem" },
  label: { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6, marginTop: 14 },
  select: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: "0.9rem", boxSizing: "border-box" as const },
  textarea: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: "0.9rem", boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: 80 },
  btn: { background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" },
  btnGhost: { background: "rgba(255,255,255,0.06)", color: "#d1d5db", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" },
  btnDanger: { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" },
  resultCard: { border: "1px solid rgba(124,58,237,0.4)", borderRadius: 16, padding: "1.75rem", background: "rgba(124,58,237,0.05)", marginTop: "1.5rem" },
  sectionHead: { fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: 18, marginBottom: 6 },
  textBlock: { background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px", fontSize: "0.88rem", color: "#d1d5db", lineHeight: 1.6 },
  badge: (color: string): React.CSSProperties => ({ background: color + "22", color, borderRadius: 20, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 700 }),
  tag: { background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace" },
  tagRow: { display: "flex", flexWrap: "wrap" as const, gap: 6 },
  copyBtn: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "5px 12px", fontSize: "0.78rem", cursor: "pointer", color: "#d1d5db", marginLeft: 8 },
  infoBanner: { display: "flex", alignItems: "center", gap: 8, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: "0.85rem", color: "#34d399", marginBottom: "1rem" },
};

function copy(t: string) { navigator.clipboard.writeText(t).catch(() => {}); }

const statusColor: Record<JobStatus, string> = {
  pending: "#6b7280", running: "#f59e0b", done: "#10b981", error: "#ef4444", skipped: "#6366f1",
};
const statusIcon: Record<JobStatus, string> = {
  pending: "○", running: "⟳", done: "✓", error: "✗", skipped: "→",
};

export default function MetaEnhancerPage() {
  const [mode, setMode] = useState<"single" | "vault">("single");

  // Single mode state
  const [releases, setReleases] = useState<Release[]>([]);
  const [selectedRelease, setSelectedRelease] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [result, setResult] = useState<Enhanced | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [platformLinks, setPlatformLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [fetchStatus, setFetchStatus] = useState<"idle"|"fetching"|"done"|"exists"|"error">("idle");
  const [fetchedFile, setFetchedFile] = useState("");
  const [fetchError, setFetchError] = useState("");

  // Vault loop state
  const [vaultTracks, setVaultTracks] = useState<VaultTrack[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [skipEnhanced, setSkipEnhanced] = useState(true);
  const [batchContext, setBatchContext] = useState("");
  const cancelRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/vault/releases-with-tracks")
      .then(r => r.json())
      .then(d => { setReleases(d.releases ?? []); setLoadingReleases(false); })
      .catch(() => setLoadingReleases(false));

    fetch("/api/metadata-enhancer-batch")
      .then(r => r.json())
      .then(d => setVaultTracks(d.tracks ?? []));
  }, []);

  const currentRelease = releases.find(r => r.id === selectedRelease);
  const tracks = currentRelease?.tracks ?? [];

  // ── Single mode functions ────────────────────────────────────────────────
  async function fetchAudio() {
    if (!selectedRelease) return;
    setFetchStatus("fetching");
    setFetchError("");
    const res = await fetch("/api/vault/fetch-audio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ releaseId: selectedRelease, trackId: selectedTrack || undefined }),
    });
    const data = await res.json();
    if (data.alreadyExists) { setFetchStatus("exists"); setFetchedFile(data.masterFileUrl); }
    else if (data.success) { setFetchStatus("done"); setFetchedFile(data.masterFileUrl); }
    else { setFetchStatus("error"); setFetchError(data.error ?? "Unknown error"); }
  }

  async function enhance() {
    if (!selectedRelease) return;
    setLoading(true);
    setResult(null);
    setEnhanceError(null);
    try {
      const res = await fetch("/api/metadata-enhancer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseId: selectedRelease, trackId: selectedTrack || undefined, additionalContext }),
      });
      const data = await res.json();
      if (data.error) {
        // Extract clean message from Groq rate limit or other errors
        const rawErr = typeof data.error === "object" ? (data.error as {message?: string}).message ?? JSON.stringify(data.error) : String(data.error);
        const rateLimitMatch = rawErr.match(/Please try again in ([^.]+)/);
        setEnhanceError(rateLimitMatch ? `⏳ Rate limited — try again in ${rateLimitMatch[1]}` : rawErr);
      } else {
        setResult(data.metadata ?? null);
        setPlatformLinks(data.platformLinks ?? {});
      }
    } catch (e) {
      setEnhanceError(e instanceof Error ? e.message : "Network error");
    }
    setLoading(false);
  }

  // ── Vault loop functions ─────────────────────────────────────────────────
  function prepareJobs() {
    const filtered = skipEnhanced
      ? vaultTracks.filter(t => t.enhancerStatus !== "completed")
      : vaultTracks;
    setJobs(filtered.map(t => ({ track: t, status: "pending" })));
    setBatchDone(false);
  }

  function updateJob(trackId: string, patch: Partial<Job>) {
    setJobs(prev => prev.map(j => j.track.trackId === trackId ? { ...j, ...patch } : j));
    setTimeout(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, 100);
  }

  async function runBatch() {
    cancelRef.current = false;
    setBatchRunning(true);
    setBatchDone(false);

    const toRun = jobs.filter(j => j.status === "pending" || j.status === "error");

    for (const job of toRun) {
      if (cancelRef.current) { updateJob(job.track.trackId, { status: "pending", message: "Canceled" }); continue; }

      updateJob(job.track.trackId, { status: "running", message: "Enhancing..." });

      try {
        let res: Response | null = null;
        let data: Record<string, unknown> = {};
        let retries = 0;
        while (retries < 4) {
          res = await fetch("/api/metadata-enhancer", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              releaseId: job.track.releaseId,
              trackId: job.track.trackId,
              additionalContext: batchContext || undefined,
              batchMode: true,
            }),
          });
          data = await res.json();
          if (res.status === 429) {
            // Parse wait time from Groq error message e.g. "Please try again in 5m31s"
            const errMsg = (data as { error?: { message?: string } }).error?.message ?? "";
            const minsMatch = errMsg.match(/(\d+)m/);
            const secsMatch = errMsg.match(/(\d+\.?\d*)s/);
            const waitMs = ((minsMatch ? parseInt(minsMatch[1]) : 0) * 60 + (secsMatch ? parseFloat(secsMatch[1]) : 30) + 5) * 1000;
            const waitSec = Math.round(waitMs / 1000);
            updateJob(job.track.trackId, { status: "running", message: `⏳ Rate limited — waiting ${waitSec}s...` });
            await new Promise(r => setTimeout(r, waitMs));
            retries++;
            continue;
          }
          break;
        }
        if (data.error) {
          updateJob(job.track.trackId, { status: "error", message: String((data as { error?: unknown }).error) });
        } else {
          updateJob(job.track.trackId, { status: "done", message: `✓ Enhanced — ${(data as { metadata?: { genre?: string } }).metadata?.genre ?? ""}` });
        }
      } catch (e: unknown) {
        updateJob(job.track.trackId, { status: "error", message: String(e) });
      }

      // Small delay between tracks to be kind to APIs
      await new Promise(r => setTimeout(r, 800));
    }

    setBatchRunning(false);
    setBatchDone(true);
  }

  const energyColor: Record<string, string> = { low: "#60a5fa", medium: "#34d399", high: "#f87171" };
  const donePct = jobs.length ? Math.round((jobs.filter(j => j.status === "done" || j.status === "skipped").length / jobs.length) * 100) : 0;

  function handleCopy(text: string, key: string) {
    copy(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div style={{ ...s.page, color: "#fff", fontFamily: "sans-serif" }}>
      <h1 style={s.h1}>⚡ Meta Enhancer</h1>
      <p style={s.sub}>AI-powered metadata enhancement for your vault</p>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        <button onClick={() => setMode("single")} style={{ ...mode === "single" ? s.btn : s.btnGhost, padding: "10px 20px", fontSize: "0.88rem" }}>
          🎵 Single Track
        </button>
        <button onClick={() => { setMode("vault"); if (jobs.length === 0) prepareJobs(); }} style={{ ...mode === "vault" ? s.btn : s.btnGhost, padding: "10px 20px", fontSize: "0.88rem" }}>
          🗄️ Enhance Entire Vault {vaultTracks.length > 0 && `(${vaultTracks.length} tracks)`}
        </button>
      </div>

      {/* ── SINGLE MODE ─────────────────────────────────────────────────── */}
      {mode === "single" && (
        <div style={s.card}>
          <label style={s.label}>Release</label>
          {loadingReleases ? (
            <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>Loading releases…</p>
          ) : releases.length === 0 ? (
            <p style={{ color: "#f87171", fontSize: "0.85rem" }}>No releases found in vault.</p>
          ) : (
            <select style={s.select} value={selectedRelease} onChange={e => { setSelectedRelease(e.target.value); setSelectedTrack(""); }}>
              <option value="">— Select a release —</option>
              {releases.map(r => <option key={r.id} value={r.id}>{r.title} ({r.releaseType})</option>)}
            </select>
          )}

          {selectedRelease && tracks.length > 0 && (
            <>
              <label style={s.label}>Track (optional — enhances all if blank)</label>
              <select style={s.select} value={selectedTrack} onChange={e => setSelectedTrack(e.target.value)}>
                <option value="">— All tracks in release —</option>
                {tracks.map(t => <option key={t.id} value={t.id}>{t.title}{t.isrc ? ` · ${t.isrc}` : ""}</option>)}
              </select>
            </>
          )}

          <label style={s.label}>Additional Context (optional)</label>
          <textarea style={s.textarea} value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
            placeholder="e.g. 'AI-generated lo-fi hip hop, made with Suno, no live instruments'" />

          <div style={{ display: "flex", gap: 10, marginTop: "1.25rem" }}>
            <button onClick={fetchAudio} disabled={!selectedRelease || fetchStatus === "fetching"}
              style={{ ...s.btnGhost, flex: 1, opacity: !selectedRelease ? 0.5 : 1 }}>
              {fetchStatus === "fetching" ? "Fetching..." : fetchStatus === "done" ? "✓ Audio Fetched" : fetchStatus === "exists" ? "✓ Already in Vault" : "🎧 Fetch Audio"}
            </button>
            <button onClick={enhance} disabled={!selectedRelease || loading}
              style={{ ...s.btn, flex: 2, opacity: !selectedRelease || loading ? 0.6 : 1 }}>
              {loading ? "Enhancing…" : "✨ Enhance Metadata"}
            </button>
          </div>

          {fetchStatus === "error" && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: 8 }}>{fetchError}</p>}
          {enhanceError && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: 8 }}>⚠ {enhanceError}</p>}
          {(fetchStatus === "done" || fetchStatus === "exists") && fetchedFile && (
            <div style={{ ...s.infoBanner, marginTop: 10 }}>🎵 {fetchedFile}</div>
          )}

          {/* Result card */}
          {result && (
            <div style={s.resultCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>{result.title ?? "Enhanced Track"}</span>
                {result.vault_context_used && <span style={s.badge("#10b981")}>Vault Context ✓</span>}
              </div>

              {result.genre && <><div style={s.sectionHead}>Genre</div>
                <div style={s.tagRow}><span style={s.badge("#a855f7")}>{result.genre}</span>{result.subgenre && <span style={s.badge("#6366f1")}>{result.subgenre}</span>}</div></>}

              {result.mood && result.mood.length > 0 && <><div style={s.sectionHead}>Mood</div>
                <div style={s.tagRow}>{result.mood.map(m => <span key={m} style={s.tag}>{m}</span>)}</div></>}

              {result.energy_level && <><div style={s.sectionHead}>Energy</div>
                <span style={s.badge(energyColor[result.energy_level] ?? "#9ca3af")}>{result.energy_level}</span></>}

              {result.description && <><div style={s.sectionHead}>Description
                <button style={s.copyBtn} onClick={() => handleCopy(result.description!, "desc")}>{copied === "desc" ? "Copied!" : "Copy"}</button>
              </div><div style={s.textBlock}>{result.description}</div></>}

              {result.tags && result.tags.length > 0 && <><div style={s.sectionHead}>Tags</div>
                <div style={s.tagRow}>{result.tags.map(t => <span key={t} style={s.tag}>#{t}</span>)}</div></>}

              {result.playlist_pitch && <><div style={s.sectionHead}>Playlist Pitch
                <button style={s.copyBtn} onClick={() => handleCopy(result.playlist_pitch!, "pitch")}>{copied === "pitch" ? "Copied!" : "Copy"}</button>
              </div><div style={s.textBlock}>{result.playlist_pitch}</div></>}

              {result.similar_artists && result.similar_artists.length > 0 && <><div style={s.sectionHead}>Similar Artists</div>
                <div style={s.tagRow}>{result.similar_artists.map(a => <span key={a} style={s.tag}>{a}</span>)}</div></>}
            </div>
          )}
        </div>
      )}

      {/* ── VAULT LOOP MODE ─────────────────────────────────────────────── */}
      {mode === "vault" && (
        <div>
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>
                  Vault Loop — {vaultTracks.length} tracks found
                </div>
                <div style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                  AI will enhance metadata for every track in your vault, one by one.
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#9ca3af", fontSize: "0.82rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={skipEnhanced} onChange={e => setSkipEnhanced(e.target.checked)}
                    style={{ accentColor: "#7c3aed" }} />
                  Skip already enhanced
                </label>
              </div>
            </div>

            <label style={{ ...s.label, marginTop: 16 }}>Global Context (applied to all tracks)</label>
            <textarea style={{ ...s.textarea, minHeight: 60 }} value={batchContext} onChange={e => setBatchContext(e.target.value)}
              placeholder="e.g. 'All tracks are AI-generated using Suno, lo-fi/hip-hop style'" />

            <div style={{ display: "flex", gap: 10, marginTop: "1.25rem" }}>
              <button onClick={prepareJobs} disabled={batchRunning} style={{ ...s.btnGhost, opacity: batchRunning ? 0.5 : 1 }}>
                🔄 Reset Queue
              </button>
              {!batchRunning ? (
                <button onClick={runBatch} disabled={jobs.length === 0} style={{ ...s.btn, flex: 1, opacity: jobs.length === 0 ? 0.5 : 1 }}>
                  ▶ Run — {jobs.filter(j => j.status === "pending" || j.status === "error").length} tracks queued
                </button>
              ) : (
                <button onClick={() => { cancelRef.current = true; }} style={{ ...s.btnDanger, flex: 1 }}>
                  ⏹ Stop After Current Track
                </button>
              )}
            </div>

            {/* Progress bar */}
            {jobs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#9ca3af", marginBottom: 6 }}>
                  <span>{jobs.filter(j => j.status === "done").length} / {jobs.length} done</span>
                  <span>{donePct}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${donePct}%`, background: "linear-gradient(90deg,#7c3aed,#10b981)", borderRadius: 99, transition: "width 0.4s ease" }} />
                </div>
                {batchDone && (
                  <div style={{ ...s.infoBanner, marginTop: 12 }}>
                    🎉 All done! {jobs.filter(j => j.status === "done").length} tracks enhanced, {jobs.filter(j => j.status === "error").length} errors.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Job log */}
          {jobs.length > 0 && (
            <div ref={logRef} style={{ maxHeight: 420, overflowY: "auto" as const, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, background: "rgba(0,0,0,0.3)" }}>
              {jobs.map((job, i) => (
                <div key={job.track.trackId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < jobs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", background: job.status === "running" ? "rgba(245,158,11,0.06)" : "transparent" }}>
                  <span style={{ fontSize: "1rem", color: statusColor[job.status], minWidth: 18, textAlign: "center" as const, animation: job.status === "running" ? "spin 1s linear infinite" : undefined }}>
                    {statusIcon[job.status]}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {job.track.trackTitle}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                      {job.track.artistName} · {job.track.releaseTitle}
                    </div>
                  </div>
                  {job.message && (
                    <span style={{ fontSize: "0.75rem", color: statusColor[job.status], maxWidth: 180, textAlign: "right" as const }}>
                      {job.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
