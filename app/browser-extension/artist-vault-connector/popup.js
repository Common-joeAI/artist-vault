const vaultBaseUrlInput = document.getElementById("vaultBaseUrl");
const sessionTokenInput = document.getElementById("sessionToken");
const statusEl = document.getElementById("status");
const saveSettingsButton = document.getElementById("saveSettings");
const openVaultButton = document.getElementById("openVault");
const pullTokenButton = document.getElementById("pullToken") || document.getElementById("useTokenFromVault");
const startImportButton = document.getElementById("startImport");

const DEFAULT_VAULT_URL = "https://aiartistvault.com";

function normalizeBaseUrl(value) {
  let raw = String(value || "").trim();

  if (!raw) {
    raw = DEFAULT_VAULT_URL;
  }

  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  raw = raw.replace(/\/+$/, "");

  try {
    const parsed = new URL(raw);

    if (parsed.hostname === "www.aiartistvault.com") {
      parsed.hostname = "aiartistvault.com";
    }

    return parsed.origin;
  } catch (_error) {
    return DEFAULT_VAULT_URL;
  }
}

function renderStatus(message) {
  statusEl.textContent = message;
}

async function loadSettings() {
  const data = await chrome.storage.local.get(["avVaultBaseUrl", "avSessionToken", "avImportStatus"]);

  vaultBaseUrlInput.value = normalizeBaseUrl(data.avVaultBaseUrl || DEFAULT_VAULT_URL);
  sessionTokenInput.value = data.avSessionToken || "";
  renderStatus(data.avImportStatus || "Ready.");

  if (!data.avSessionToken) {
    pullTokenFromVault({ silent: true }).catch(() => undefined);
  }
}

async function saveSettings() {
  const baseUrl = normalizeBaseUrl(vaultBaseUrlInput.value);
  const sessionToken = sessionTokenInput.value.trim();

  await chrome.storage.local.set({
    avVaultBaseUrl: baseUrl,
    avSessionToken: sessionToken,
  });

  vaultBaseUrlInput.value = baseUrl;
  renderStatus("Settings saved.");
}

async function findVaultTabs(baseUrl) {
  const parsed = new URL(baseUrl);
  const tabs = await chrome.tabs.query({});

  return tabs.filter((tab) => {
    if (!tab.url) return false;

    try {
      const url = new URL(tab.url);
      return url.hostname === parsed.hostname || url.hostname === `www.${parsed.hostname}`;
    } catch (_error) {
      return false;
    }
  });
}

async function pullTokenFromVault(options = {}) {
  const silent = Boolean(options.silent);
  const baseUrl = normalizeBaseUrl(vaultBaseUrlInput.value);

  if (!silent) renderStatus("Looking for an open Artist Vault tab...");

  const tabs = await findVaultTabs(baseUrl);

  if (!tabs.length) {
    if (!silent) {
      renderStatus("No open Artist Vault tab found. Open Artist Vault, generate a token, then try again.");
    }

    return null;
  }

  for (const tab of tabs) {
    if (!tab.id) continue;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "AV_GET_VAULT_TOKEN" });

      if (response?.sessionToken) {
        sessionTokenInput.value = response.sessionToken;
        vaultBaseUrlInput.value = baseUrl;

        await chrome.storage.local.set({
          avVaultBaseUrl: baseUrl,
          avSessionToken: response.sessionToken,
        });

        renderStatus(`Token loaded from Vault.\nExpires: ${response.expiresAt || "unknown"}`);
        return response.sessionToken;
      }
    } catch (_error) {
      // Try the next tab.
    }
  }

  if (!silent) {
    renderStatus("Could not find an active token on the open Vault tab. Generate a token in Artist Vault, then try again.");
  }

  return null;
}

saveSettingsButton?.addEventListener("click", saveSettings);

pullTokenButton?.addEventListener("click", () => {
  pullTokenFromVault({ silent: false });
});

openVaultButton?.addEventListener("click", async () => {
  const baseUrl = normalizeBaseUrl(vaultBaseUrlInput.value);
  vaultBaseUrlInput.value = baseUrl;
  await chrome.tabs.create({ url: `${baseUrl}/vault/import/distrokid` });
});

startImportButton?.addEventListener("click", async () => {
  const baseUrl = normalizeBaseUrl(vaultBaseUrlInput.value);
  let sessionToken = sessionTokenInput.value.trim();

  vaultBaseUrlInput.value = baseUrl;

  if (!sessionToken) {
    sessionToken = await pullTokenFromVault({ silent: false }) || "";
  }

  if (!sessionToken) {
    renderStatus("Missing import token. Generate one in Artist Vault, then pull it into the connector.");
    return;
  }

  await chrome.storage.local.set({
    avVaultBaseUrl: baseUrl,
    avSessionToken: sessionToken,
    avImportStatus: "Starting import..."
  });

  chrome.runtime.sendMessage(
    {
      type: "AV_START_IMPORT",
      vaultBaseUrl: baseUrl,
      sessionToken
    },
    (response) => {
      if (chrome.runtime.lastError) {
        renderStatus(chrome.runtime.lastError.message);
        return;
      }

      if (!response) {
        renderStatus("No response received from background worker.");
        return;
      }

      renderStatus(response.message || "Import started.");
    }
  );
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if (changes.avImportStatus) {
    renderStatus(changes.avImportStatus.newValue || "Ready.");
  }
});

loadSettings().catch((error) => {
  renderStatus(error instanceof Error ? error.message : "Unable to load connector settings.");
});
