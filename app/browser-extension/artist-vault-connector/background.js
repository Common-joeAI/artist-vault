/**
 * Artist Vault Browser Extension — background.js
 * Supports: DistroKid, SoundOn
 */

const VAULT_BASE = "https://aiartistvault.com";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "START_IMPORT") {
    handleImport(message.provider, message.data)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }
});

async function handleImport(provider, data) {
  // 1. Create session
  const sessionRes = await fetch(`${VAULT_BASE}/api/import/${provider}/session`, {
    method: "POST",
    credentials: "include",
  });

  if (!sessionRes.ok) {
    throw new Error(`Failed to create ${provider} import session.`);
  }

  const { session_token } = await sessionRes.json();

  // 2. Push data
  const pushRes = await fetch(`${VAULT_BASE}/api/import/${provider}/push`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      session_token,
      releases: data.releases,
    }),
  });

  if (!pushRes.ok) {
    const err = await pushRes.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `${provider} import failed.`);
  }

  const result = await pushRes.json();

  return {
    sessionToken: session_token,
    releaseCount: result.releaseCount,
    errors: result.errors ?? [],
  };
}
