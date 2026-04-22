const vaultBaseUrlInput = document.getElementById("vaultBaseUrl");
const sessionTokenInput = document.getElementById("sessionToken");
const statusEl = document.getElementById("status");
const saveSettingsButton = document.getElementById("saveSettings");
const openVaultButton = document.getElementById("openVault");
const startImportButton = document.getElementById("startImport");

async function loadSettings() {
  const data = await chrome.storage.local.get(["avVaultBaseUrl", "avSessionToken", "avImportStatus"]);
  vaultBaseUrlInput.value = data.avVaultBaseUrl || "https://aiartistvault.com";
  sessionTokenInput.value = data.avSessionToken || "";
  renderStatus(data.avImportStatus || "Ready.");
}

async function saveSettings() {
  const baseUrl = vaultBaseUrlInput.value.trim().replace(/\/$/, "");
  const sessionToken = sessionTokenInput.value.trim();

  await chrome.storage.local.set({
    avVaultBaseUrl: baseUrl,
    avSessionToken: sessionToken,
  });

  renderStatus("Settings saved.");
}

function renderStatus(message) {
  statusEl.textContent = message;
}

saveSettingsButton.addEventListener("click", saveSettings);

openVaultButton.addEventListener("click", async () => {
  const baseUrl = vaultBaseUrlInput.value.trim().replace(/\/$/, "") || "https://aiartistvault.com";
  await chrome.tabs.create({ url: `${baseUrl}/vault/import/distrokid` });
});

startImportButton.addEventListener("click", async () => {
  const baseUrl = vaultBaseUrlInput.value.trim().replace(/\/$/, "");
  const sessionToken = sessionTokenInput.value.trim();

  if (!baseUrl) {
    renderStatus("Missing Artist Vault base URL.");
    return;
  }

  if (!sessionToken) {
    renderStatus("Missing import token.");
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
