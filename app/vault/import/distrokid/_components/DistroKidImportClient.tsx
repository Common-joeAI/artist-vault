"use client";

import { useMemo, useState } from "react";

const DISTROKID_SESSION_STORAGE_KEY = "artistVaultDistroKidImportSession";

type SessionResponse = {
  session_token: string;
  expires_at: string;
  status_url: string;
};

type StatusResponse = {
  session_token: string;
  status: string;
  release_count: number;
  imported_files: string[];
  payload_file: string | null;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  errors: string[];
};

export default function DistroKidImportClient() {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  async function createSession() {
    setLoading(true);
    try {
      const response = await fetch("/api/import/distrokid/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as SessionResponse;
      setSession(data);
      setStatus(null);
      setCopied(false);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          DISTROKID_SESSION_STORAGE_KEY,
          JSON.stringify({
            session_token: data.session_token,
            expires_at: data.expires_at,
            status_url: data.status_url,
            saved_at: new Date().toISOString(),
          }),
        );
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to create import token.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!session?.session_token) return;
    await navigator.clipboard.writeText(session.session_token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function checkStatus() {
    if (!session?.session_token) return;
    setStatusLoading(true);
    try {
      const response = await fetch(`/api/import/distrokid/status/${encodeURIComponent(session.session_token)}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as StatusResponse;
      setStatus(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to fetch status.");
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-white">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950/40 via-black to-black p-8 shadow-2xl">
        <div className="mb-6">
          <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Connector import
          </div>
          <h1 className="text-3xl font-bold">DistroKid browser connector</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/70">
            Use a browser extension to read release pages from a DistroKid session that the user has already
            signed into. The extension pushes normalized release metadata into Artist Vault without storing
            the user's DistroKid password.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">1. Generate import token</h2>
            <p className="mt-2 text-sm text-white/65">
              Create a short-lived token, paste it into the extension popup, then start the import while you are on
              DistroKid.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={createSession}
                disabled={loading}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate import token"}
              </button>

              <button
                onClick={checkStatus}
                disabled={!session || statusLoading}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {statusLoading ? "Checking..." : "Refresh status"}
              </button>
            </div>

            {session ? (
              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">Active token</div>
                <div data-artist-vault-distrokid-token={session.session_token} className="mt-2 break-all rounded-lg bg-black/40 p-3 font-mono text-sm">
                  {session.session_token}
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    onClick={copyToken}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    {copied ? "Copied" : "Copy token"}
                  </button>

                  <a
                    href="https://distrokid.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Open DistroKid
                  </a>
                </div>

                <div className="mt-3 text-sm text-white/65">
                  Expires: <span className="text-white">{new Date(session.expires_at).toLocaleString()}</span>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">2. Load the connector</h2>
            <ol className="mt-3 space-y-2 text-sm text-white/70">
              <li>1. Open Chrome or Edge extensions.</li>
              <li>2. Turn on developer mode.</li>
              <li>3. Load unpacked extension from <code className="text-violet-300">browser-extension/artist-vault-connector</code>.</li>
              <li>4. Open DistroKid and sign in.</li>
              <li>5. On a release listing page, open the extension and start the import.</li>
            </ol>

            <a
              href="/api/import/distrokid/connector"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Download connector ZIP
            </a>

            <p className="mt-3 text-xs text-white/55">
              Download, unzip, then use Chrome or Edge &quot;Load unpacked&quot; on the unzipped connector folder.
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/65">
              <div className="font-semibold text-white">Default vault origin</div>
              <div className="mt-2 break-all font-mono text-violet-300">{origin || "Unknown"}</div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">3. Import status</h2>

          {status ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Session</div>
                <div className="mt-2 font-mono text-sm break-all">{status.session_token}</div>
                <div className="mt-3 text-sm text-white/70">Status: <span className="text-white">{status.status}</span></div>
                <div className="mt-2 text-sm text-white/70">
                  Releases imported: <span className="text-white">{status.release_count}</span>
                </div>
                <div className="mt-2 text-sm text-white/70">
                  Payload file: <span className="text-white">{status.payload_file ?? "None yet"}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Inbox files</div>
                <div className="mt-3 max-h-48 space-y-2 overflow-auto text-sm text-white/70">
                  {status.imported_files.length ? (
                    status.imported_files.map((file) => (
                      <div key={file} className="rounded-lg bg-white/5 px-3 py-2 font-mono text-xs">
                        {file}
                      </div>
                    ))
                  ) : (
                    <div>No imported release files yet.</div>
                  )}
                </div>
              </div>

              {!!status.errors.length && (
                <div className="md:col-span-2 rounded-2xl border border-red-500/20 bg-red-950/20 p-4">
                  <div className="text-sm font-semibold text-red-200">Errors</div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-100/90">
                    {status.errors.map((error, index) => (
                      <li key={`${error}-${index}`}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/60">No import status loaded yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
