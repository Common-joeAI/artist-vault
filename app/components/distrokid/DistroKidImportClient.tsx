"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type JsonRecord = Record<string, unknown>;

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 18,
  background: "rgba(255,255,255,0.02)",
};

const buttonBase: React.CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const primaryButton: React.CSSProperties = {
  ...buttonBase,
  background: "#7c3aed",
  color: "#fff",
  borderColor: "#7c3aed",
};

const secondaryButton: React.CSSProperties = {
  ...buttonBase,
  background: "transparent",
  color: "inherit",
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function pickString(record: JsonRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function pickNumber(record: JsonRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return fallback;
}

function pickArrayCount(record: JsonRecord, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.length;
  }
  return 0;
}

function formatDate(value: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function DistroKidImportClient() {
  const [sessionToken, setSessionToken] = useState("");
  const [activeToken, setActiveToken] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [vaultOrigin, setVaultOrigin] = useState("https://www.aiartistvault.com");
  const [status, setStatus] = useState<JsonRecord | null>(null);
  const [statusText, setStatusText] = useState("Waiting to start.");
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  const manualRef = useRef<HTMLDetailsElement | null>(null);

  const releaseCount = useMemo(() => {
    const record = status ?? {};
    return (
      pickNumber(record, ["releaseCount", "candidateCount", "importedCount", "count"], 0) ||
      pickArrayCount(record, ["releases", "candidates", "items", "results"])
    );
  }, [status]);

  const phaseLabel = useMemo(() => {
    const record = status ?? {};
    return pickString(record, ["status", "phase", "state"], "Waiting for import");
  }, [status]);

  async function copyTokenToClipboard(token: string) {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopyState("Token copied");
      window.setTimeout(() => setCopyState(""), 2000);
    } catch {
      setCopyState("Copy failed");
      window.setTimeout(() => setCopyState(""), 2000);
    }
  }

  async function refreshStatus(explicitSessionToken?: string) {
    const tokenToUse = explicitSessionToken || sessionToken;
    if (!tokenToUse) return;

    try {
      const response = await fetch(
        `/api/import/distrokid/status/${encodeURIComponent(tokenToUse)}`,
        { method: "GET", cache: "no-store" }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Unable to load import status.");
      }

      const data = asRecord(await response.json());
      const merged = { ...asRecord(data.session), ...data };

      setStatus(merged);

      const discovered =
        pickNumber(merged, ["releaseCount", "candidateCount", "importedCount", "count"], 0) ||
        pickArrayCount(merged, ["releases", "candidates", "items", "results"]);

      const nextPhase = pickString(
        merged,
        ["status", "phase", "state"],
        discovered > 0 ? "Releases found" : "Waiting for import"
      );

      setStatusText(
        discovered > 0
          ? `${discovered} release${discovered === 1 ? "" : "s"} found`
          : nextPhase
      );
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Unable to load status.");
    }
  }

  async function startImport() {
    setBusy(true);
    setStatusText("Preparing import…");

    try {
      const response = await fetch("/api/import/distrokid/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Unable to start DistroKid import.");
      }

      const data = asRecord(await response.json());
      const merged = { ...asRecord(data.session), ...data };

      const nextSessionToken = pickString(
        merged,
        ["sessionToken", "session_token", "id", "tokenId"],
        ""
      );
      const nextActiveToken = pickString(
        merged,
        ["activeToken", "importToken", "token", "import_token"],
        ""
      );
      const nextExpiresAt = pickString(
        merged,
        ["expiresAt", "tokenExpiresAt", "expires_at"],
        ""
      );
      const nextVaultOrigin = pickString(
        merged,
        ["vaultOrigin", "origin", "defaultVaultOrigin"],
        vaultOrigin
      );

      setSessionToken(nextSessionToken);
      setActiveToken(nextActiveToken);
      setExpiresAt(nextExpiresAt);
      setVaultOrigin(nextVaultOrigin);

      if (nextActiveToken) {
        await copyTokenToClipboard(nextActiveToken);
      }

      setStatusText(
        nextActiveToken
          ? "Token ready. Install the connector, open DistroKid, and start the import."
          : "Import session ready."
      );

      await refreshStatus(nextSessionToken);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Unable to start import.");
    } finally {
      setBusy(false);
    }
  }

  function openManualSetup() {
    setManualOpen(true);
    if (activeToken) {
      void copyTokenToClipboard(activeToken);
    }
    window.setTimeout(() => {
      manualRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function openDistroKid() {
    window.open("https://distrokid.com", "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    if (!sessionToken) return;

    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [sessionToken]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          DistroKid import
        </div>
        <h2 style={{ margin: "8px 0 6px" }}>Import your DistroKid releases</h2>
        <p style={{ margin: 0, opacity: 0.85, maxWidth: 820 }}>
          Start an import, download the connector, then open DistroKid and run the import from the connector.
          The token is copied automatically when you start.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div style={cardStyle}>
          <div style={{ fontSize: 13, opacity: 0.72, marginBottom: 8 }}>Step 1</div>
          <h3 style={{ marginTop: 0 }}>Start import</h3>
          <p style={{ opacity: 0.82 }}>
            Generate a short-lived token for your import session.
          </p>
          <button type="button" onClick={startImport} disabled={busy} style={primaryButton}>
            {busy ? "Starting…" : "Start DistroKid import"}
          </button>
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
            {activeToken ? "Token ready and copied." : "No active token yet."}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, opacity: 0.72, marginBottom: 8 }}>Step 2</div>
          <h3 style={{ marginTop: 0 }}>Download connector</h3>
          <p style={{ opacity: 0.82 }}>
            Download the browser connector zip, unzip it, then load the extracted folder in Chrome or Edge.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/downloads/artist-vault-connector.zip" download style={secondaryButton}>
              Download connector
            </a>
            <button type="button" onClick={openManualSetup} style={secondaryButton}>
              Manual setup
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
            {copyState || "Download first, then use Manual setup if needed."}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, opacity: 0.72, marginBottom: 8 }}>Step 3</div>
          <h3 style={{ marginTop: 0 }}>Open DistroKid</h3>
          <p style={{ opacity: 0.82 }}>
            Sign in to DistroKid, then use the connector to start the import.
          </p>
          <button type="button" onClick={openDistroKid} style={secondaryButton}>
            Open DistroKid
          </button>
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
            Use the connector while you are on DistroKid.
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Status</div>
            <div style={{ fontWeight: 700 }}>{phaseLabel}</div>
            <div style={{ fontSize: 13, opacity: 0.78, marginTop: 6 }}>{statusText}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Releases found</div>
            <div style={{ fontWeight: 700 }}>{releaseCount}</div>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Token expires</div>
            <div style={{ fontWeight: 700 }}>{formatDate(expiresAt)}</div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => refreshStatus()}
              disabled={!sessionToken}
              style={secondaryButton}
            >
              Refresh status
            </button>
          </div>
        </div>
      </div>

      <details
        ref={manualRef}
        open={manualOpen}
        onToggle={(event) => setManualOpen((event.currentTarget as HTMLDetailsElement).open)}
        style={cardStyle}
      >
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          Manual setup
        </summary>

        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <p style={{ margin: 0, opacity: 0.82 }}>
            Use this only if you need the manual install steps or want to copy the token again.
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="distrokid-import-token" style={{ fontSize: 13, opacity: 0.72 }}>
              Active token
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                id="distrokid-import-token"
                type="text"
                value={activeToken}
                readOnly
                placeholder="Start import to generate a token"
                style={{
                  flex: "1 1 420px",
                  minWidth: 280,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.2)",
                  color: "inherit",
                  padding: "10px 12px",
                }}
              />
              <button
                type="button"
                onClick={() => copyTokenToClipboard(activeToken)}
                disabled={!activeToken}
                style={secondaryButton}
              >
                Copy token
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, opacity: 0.72 }}>Connector setup</div>
            <ol style={{ margin: 0, paddingLeft: 18, opacity: 0.88, display: "grid", gap: 8 }}>
              <li>Open Chrome or Edge extensions.</li>
              <li>Turn on Developer mode.</li>
              <li>Select Load unpacked and choose the extracted <code>artist-vault-connector</code> folder.</li>
              <li>Open DistroKid and sign in.</li>
              <li>Open the connector, paste the token if needed, and start the import.</li>
            </ol>
          </div>

          <div style={{ fontSize: 13, opacity: 0.72 }}>
            Default vault origin: <span style={{ opacity: 0.95 }}>{vaultOrigin}</span>
          </div>

          {status ? (
            <details style={{ marginTop: 4 }}>
              <summary style={{ cursor: "pointer" }}>Import details</summary>
              <pre
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  overflow: "auto",
                  background: "rgba(0,0,0,0.24)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                {JSON.stringify(status, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      </details>
    </div>
  );
}

export default DistroKidImportClient;
