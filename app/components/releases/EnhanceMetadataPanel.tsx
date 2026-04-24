"use client";

import { useMemo, useRef, useState } from "react";

type WordTimestamp = {
  word: string;
  startMs: number;
  endMs: number;
  confidence?: number | null;
};

type LyricsSection = {
  label: string;
  startMs?: number | null;
  endMs?: number | null;
  text: string;
};

type EnhancementPayload = {
  normalizedMetadata: {
    title: string | null;
    artist: string | null;
    album: string | null;
    label: string | null;
    releaseDate?: string | null;
    isrc: string | null;
    upc: string | null;
    distributorName: string | null;
    distributionKnown: boolean | null;
    distributionStatusText: string | null;
    streamingLinks: Record<string, string | null | undefined>;
  };
  lyrics: {
    source: string;
    confidence: number | null;
    plainText: string | null;
    sections: LyricsSection[];
    words: WordTimestamp[];
    lrc: string | null;
    srt: string | null;
    warnings: string[];
  };
  rights: {
    ascapReadyNotes: string;
    bmiReadyNotes: string;
    humanAuthorshipFlags: Array<{ key: string; level: "info" | "review" | "high"; note: string }>;
    suggestedWriterSplits: Array<{
      name: string;
      role: string;
      percent: number | null;
      rationale: string;
      needsReview: boolean;
    }>;
  };
  pressKit: {
    shortBioSuggestion: string;
    releaseBlurbSuggestion: string;
    taglineSuggestion: string | null;
  };
  review: {
    warnings: string[];
    confidenceSummary: string;
    conflicts: string[];
    missingFields: string[];
  };
};

type ExistingTrackSnapshot = {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  isrc?: string | null;
  upc?: string | null;
  lyricsText?: string | null;
};

type Props = {
  trackId: string;
  existingAudioUrl?: string | null;
  existing: ExistingTrackSnapshot;
};

export function EnhanceMetadataPanel({ trackId, existingAudioUrl, existing }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<string>("Idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnhancementPayload | null>(null);
  const [editableLyrics, setEditableLyrics] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl ?? null);
  const [currentMs, setCurrentMs] = useState<number>(0);

  const activeWordIndex = useMemo(() => {
    if (!result?.lyrics.words?.length) return -1;
    return result.lyrics.words.findIndex((w) => currentMs >= w.startMs && currentMs <= w.endMs);
  }, [currentMs, result]);

  async function runEnhancement() {
    setIsRunning(true);
    setError(null);
    setStatus("Uploading and fingerprinting audio...");
    setResult(null);

    try {
      const form = new FormData();
      form.append("trackId", trackId);
      form.append("useExistingVaultFile", file ? "false" : "true");

      if (audioUrl) form.append("audioUrl", audioUrl);
      if (file) form.append("file", file);

      const res = await fetch("/api/metadata-enhance", {
        method: "POST",
        body: form,
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error ?? "Enhancement failed.");
      }

      setStatus("Metadata enhanced.");
      setResult(payload.enhancement);
      setEditableLyrics(payload.enhancement?.lyrics?.plainText ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enhancement failed.");
      setStatus("Failed");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 20,
        display: "grid",
        gap: 20,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Metadata enhancer
          </div>
          <h3 style={{ margin: "6px 0 8px", fontSize: 24 }}>Enhance Metadata</h3>
          <p style={{ margin: 0, opacity: 0.8, maxWidth: 800 }}>
            Fingerprint the song, enrich metadata, fetch streaming links and identifiers, generate structured lyrics,
            and produce ASCAP/BMI notes plus press-kit suggestions.
          </p>
        </div>
        <div style={{ minWidth: 220, textAlign: "right" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Status</div>
          <div style={{ fontWeight: 700 }}>{isRunning ? "Processing..." : status}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={buttonStyle("secondary")} disabled={isRunning}>
            Choose MP3/WAV
          </button>

          <button type="button" onClick={runEnhancement} style={buttonStyle("primary")} disabled={isRunning || (!file && !audioUrl)}>
            {isRunning ? "Enhancing..." : "Enhance Metadata"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/x-wav,audio/flac"
            hidden
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              setFile(selected);
              if (selected) {
                setAudioUrl(URL.createObjectURL(selected));
              }
            }}
          />

          <div style={{ opacity: 0.8, fontSize: 14 }}>
            {file ? `Selected: ${file.name}` : existingAudioUrl ? "Using existing vault file" : "No source file selected"}
          </div>
        </div>

        {error ? (
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,0,0,0.08)", color: "#ffb4b4" }}>
            {error}
          </div>
        ) : null}
      </div>

      {audioUrl ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Audio preview</div>
          <audio
            src={audioUrl}
            controls
            style={{ width: "100%" }}
            onTimeUpdate={(e) => setCurrentMs(Math.floor((e.currentTarget.currentTime ?? 0) * 1000))}
          />
          {activeWordIndex >= 0 && result?.lyrics.words?.[activeWordIndex] ? (
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              Sync preview: <strong>{result.lyrics.words[activeWordIndex].word}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <DiffCard label="Title" before={existing.title ?? "—"} after={result.normalizedMetadata.title ?? "—"} />
            <DiffCard label="Artist" before={existing.artist ?? "—"} after={result.normalizedMetadata.artist ?? "—"} />
            <DiffCard label="Album" before={existing.album ?? "—"} after={result.normalizedMetadata.album ?? "—"} />
            <DiffCard label="ISRC" before={existing.isrc ?? "—"} after={result.normalizedMetadata.isrc ?? "—"} />
            <DiffCard label="UPC" before={existing.upc ?? "—"} after={result.normalizedMetadata.upc ?? "—"} />
            <DiffCard
              label="Distribution"
              before="—"
              after={
                result.normalizedMetadata.distributionStatusText ??
                (result.normalizedMetadata.distributionKnown ? "Known" : "Unknown")
              }
            />
          </div>

          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>Streaming links</h4>
            <div style={{ display: "grid", gap: 8 }}>
              {Object.entries(result.normalizedMetadata.streamingLinks).map(([key, value]) => (
                <div key={key} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ width: 120, opacity: 0.75 }}>{key}</div>
                  {value ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : <span style={{ opacity: 0.5 }}>Not found</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>Editable lyrics</h4>
            <textarea
              value={editableLyrics}
              onChange={(e) => setEditableLyrics(e.target.value)}
              style={{
                width: "100%",
                minHeight: 260,
                borderRadius: 12,
                padding: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "inherit",
              }}
            />
          </div>

          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>Rights notes</h4>
            <div style={{ display: "grid", gap: 12 }}>
              <TextBlock label="ASCAP" text={result.rights.ascapReadyNotes} />
              <TextBlock label="BMI" text={result.rights.bmiReadyNotes} />
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>Press-kit suggestions</h4>
            <div style={{ display: "grid", gap: 12 }}>
              <TextBlock label="Short bio" text={result.pressKit.shortBioSuggestion} />
              <TextBlock label="Release blurb" text={result.pressKit.releaseBlurbSuggestion} />
              {result.pressKit.taglineSuggestion ? <TextBlock label="Tagline" text={result.pressKit.taglineSuggestion} /> : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function DiffCard({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Before</div>
          <div>{before}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>After</div>
          <div style={{ fontWeight: 700 }}>{after}</div>
        </div>
      </div>
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>{text}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: 16,
  background: "rgba(255,255,255,0.02)",
};

const cardTitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 18,
};

function buttonStyle(variant: "primary" | "secondary"): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: "10px 14px",
    border: variant === "primary" ? "none" : "1px solid rgba(255,255,255,0.12)",
    background: variant === "primary" ? "#ffffff" : "rgba(255,255,255,0.05)",
    color: variant === "primary" ? "#111" : "inherit",
    fontWeight: 700,
    cursor: "pointer",
  };
}
