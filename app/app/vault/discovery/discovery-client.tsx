"use client";

import { useState } from "react";

type DiscoveredRelease = {
  platform: string;
  url: string;
  title: string;
  artist: string;
  releaseDate: string | null;
  thumbnailUrl: string | null;
  confidence: "high" | "medium" | "low";
  alreadyInVault: boolean;
  notes: string;
};

type LastJob = {
  status: string;
  completedAt: string | null;
  discovered: unknown[];
  aiSummary: string | null;
};

export function DiscoveryClient({
  artistProfileId,
  artistName,
  lastJob,
}: {
  artistProfileId: string | null;
  artistName: string | null;
  lastJob: LastJob | null;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    newReleases: DiscoveredRelease[];
    alreadyInVault: DiscoveredRelease[];
    aiSummary: string;
    totalFound: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDiscovery() {
    if (!artistProfileId) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/discovery/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistProfileId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Discovery failed.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!artistProfileId) {
    return (
      <div style={cardStyle}>
        <p style={{ color: "#9ca3af" }}>
          Complete your onboarding and set up an artist profile before running discovery.
        </p>
      </div>
    );
  }

  const displayResult = result ?? (lastJob?.discovered.length ? {
    newReleases: (lastJob.discovered as DiscoveredRelease[]).filter(r => !r.alreadyInVault),
    alreadyInVault: (lastJob.discovered as DiscoveredRelease[]).filter(r => r.alreadyInVault),
    aiSummary: lastJob.aiSummary ?? "",
    totalFound: lastJob.discovered.length,
  } : null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Run card */}
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>
          Search for {artistName}'s releases
        </h3>
        <p style={{ color: "#9ca3af", margin: "0 0 1.25rem", fontSize: "0.9rem" }}>
          We'll search Spotify and YouTube for your music and compare against what's
          already in your vault.
        </p>
        <button
          onClick={runDiscovery}
          disabled={loading}
          style={btnStyle}
        >
          {loading ? "🔍 Scanning… this takes ~15 seconds" : "🔍 Run AI Discovery"}
        </button>
        {lastJob?.completedAt && !result && (
          <p style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "0.75rem" }}>
            Last run: {new Date(lastJob.completedAt).toLocaleString()}
          </p>
        )}
      </div>

      {error && (
        <div style={{ ...cardStyle, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
          <p style={{ color: "#fca5a5", margin: 0 }}>❌ {error}</p>
        </div>
      )}

      {/* AI summary */}
      {displayResult?.aiSummary && (
        <div style={{ ...cardStyle, borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.06)" }}>
          <div style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            🤖 Claude's Analysis
          </div>
          <p style={{ margin: 0, lineHeight: 1.7, color: "#d1d5db" }}>{displayResult.aiSummary}</p>
        </div>
      )}

      {/* New releases */}
      {displayResult && displayResult.newReleases.length > 0 && (
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
            🆕 {displayResult.newReleases.length} release{displayResult.newReleases.length !== 1 ? "s" : ""} not in your vault
          </h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {displayResult.newReleases.map((r, i) => (
              <ReleaseRow key={i} release={r} highlight />
            ))}
          </div>
        </div>
      )}

      {/* Already in vault */}
      {displayResult && displayResult.alreadyInVault.length > 0 && (
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#9ca3af" }}>
            ✅ {displayResult.alreadyInVault.length} already in your vault
          </h3>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {displayResult.alreadyInVault.map((r, i) => (
              <ReleaseRow key={i} release={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReleaseRow({ release, highlight }: { release: DiscoveredRelease; highlight?: boolean }) {
  const platformEmoji: Record<string, string> = {
    spotify: "🟢",
    youtube: "🔴",
    apple_music: "⬛",
    soundcloud: "🟠",
  };

  const confidenceColor: Record<string, string> = {
    high: "#86efac",
    medium: "#fde047",
    low: "#9ca3af",
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.75rem 1rem",
      borderRadius: 10,
      border: `1px solid ${highlight ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)"}`,
      background: highlight ? "rgba(99,102,241,0.04)" : "rgba(255,255,255,0.02)",
    }}>
      {release.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={release.thumbnailUrl}
          alt={release.title}
          style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {platformEmoji[release.platform] ?? "🎵"} {release.title}
        </div>
        <div style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
          {release.platform} · {release.releaseDate ?? "unknown date"}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <span style={{ fontSize: "0.7rem", color: confidenceColor[release.confidence], fontWeight: 600 }}>
          {release.confidence}
        </span>
        <a
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}
        >
          View →
        </a>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
  padding: "1.25rem 1.5rem",
};

const btnStyle: React.CSSProperties = {
  padding: "0.75rem 1.5rem",
  borderRadius: 10,
  background: "#6366f1",
  color: "white",
  border: "none",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
  opacity: 1,
};
