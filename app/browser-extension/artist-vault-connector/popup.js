const DEFAULT_VAULT_ORIGIN = "https://www.aiartistvault.com";
const IMPORTER_PATH = "/vault/pro/releases/import/distrokid";

const vaultOriginInput = document.getElementById("vaultOrigin");
const importTokenInput = document.getElementById("importToken");
const pullFromVaultButton = document.getElementById("pullFromVault");
const openVaultButton = document.getElementById("openVault");
const saveConfigButton = document.getElementById("saveConfig");
const startImportButton = document.getElementById("startImport");
const statusBox = document.getElementById("status");

function setStatus(message) {
  statusBox.textContent = message;
}

function isVaultImporterUrl(url) {
  return /^https:\/\/(www\.)?aiartistvault\.com\/vault\/pro\/releases\/import\/distrokid/i.test(url || "");
}

async function getStoredConfig() {
  return chrome.storage.local.get(["vaultOrigin", "importToken"]);
}

async function saveStoredConfig(vaultOrigin, importToken) {
  await chrome.storage.local.set({ vaultOrigin, importToken });
}

async function findOpenVaultTab() {
  const tabs = await chrome.tabs.query({});
  return tabs.find((tab) => isVaultImporterUrl(tab.url)) || null;
}

async function pullTokenFromVault(showSuccess = true) {
  const vaultTab = await findOpenVaultTab();

  if (!vaultTab || !vaultTab.id) {
    setStatus("Open the Artist Vault importer page first, then click Start DistroKid import there.");
    return false;
  }

  let response;
  try {
    response = await chrome.tabs.sendMessage(vaultTab.id, {
      type: "AV_GET_VAULT_IMPORT_CONTEXT",
    });
  } catch (_error) {
    setStatus("Could not read the open Vault tab. Reload the Vault page and try again.");
    return false;
  }

  if (!response?.ok) {
    setStatus(response?.message || "Could not read the Vault page.");
    return false;
  }

  if (!response.token) {
    setStatus("No token found on the Vault page. In Artist Vault, click Start DistroKid import first.");
    return false;
  }

  const vaultOrigin = response.vaultOrigin || new URL(vaultTab.url).origin;
  vaultOriginInput.value = vaultOrigin;
  importTokenInput.value = response.token;

  await saveStoredConfig(vaultOrigin, response.token);

  if (showSuccess) {
    setStatus("Token pulled from the open Vault tab.");
  }

  return true;
}

async function saveConfig() {
  const vaultOrigin = (vaultOriginInput.value || DEFAULT_VAULT_ORIGIN).trim();
  const importToken = (importTokenInput.value || "").trim();

  await saveStoredConfig(vaultOrigin, importToken);
  setStatus("Saved.");
}

async function openVault() {
  const vaultOrigin = (vaultOriginInput.value || DEFAULT_VAULT_ORIGIN).trim();
  await chrome.tabs.create({ url: `${vaultOrigin}${IMPORTER_PATH}` });
}

async function startImport() {
  let vaultOrigin = (vaultOriginInput.value || DEFAULT_VAULT_ORIGIN).trim();
  let importToken = (importTokenInput.value || "").trim();

  // Manual mode: if both fields are filled, do NOT depend on Vault tab lookup.
  if (!vaultOrigin) {
    vaultOrigin = DEFAULT_VAULT_ORIGIN;
    vaultOriginInput.value = vaultOrigin;
  }

  if (!importToken) {
    const pulled = await pullTokenFromVault(false);
    if (!pulled) return;

    vaultOrigin = (vaultOriginInput.value || DEFAULT_VAULT_ORIGIN).trim();
    importToken = (importTokenInput.value || "").trim();
  }

  if (!vaultOrigin) {
    setStatus("Missing vault base URL.");
    return;
  }

  if (!importToken) {
    setStatus("Missing import token.");
    return;
  }

  await saveStoredConfig(vaultOrigin, importToken);

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.url || !/https:\/\/(.+\.)?distrokid\.com/i.test(activeTab.url)) {
    setStatus("Open a DistroKid releases page before starting the import.");
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: "AV_START_IMPORT",
      sessionToken: importToken,
      importToken,
      token: importToken,
      vaultBaseUrl: vaultOrigin,
      vaultOrigin,
      baseUrl: vaultOrigin,
      tabId: activeTab.id || null,
      pageUrl: activeTab.url,
    });

    setStatus(response?.message || (response?.ok ? "Import started." : "Import failed."));
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Import failed.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const stored = await getStoredConfig();
  vaultOriginInput.value = stored.vaultOrigin || DEFAULT_VAULT_ORIGIN;
  importTokenInput.value = stored.importToken || "";
  setStatus("Ready.");
});

pullFromVaultButton.addEventListener("click", () => {
  void pullTokenFromVault(true);
});

openVaultButton.addEventListener("click", () => {
  void openVault();
});

saveConfigButton.addEventListener("click", () => {
  void saveConfig();
});

startImportButton.addEventListener("click", () => {
  void startImport();
});
