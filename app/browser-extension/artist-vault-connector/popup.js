const importBtn = document.getElementById("importBtn");
const openVaultBtn = document.getElementById("openVault");
const siteBadge = document.getElementById("siteBadge");
const statusEl = document.getElementById("status");

function showStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = "block";
}

function detectProvider(url) {
  if (url.includes("distrokid.com")) return "distrokid";
  if (url.includes("sound.on") || url.includes("soundon")) return "soundon";
  return null;
}

// Detect current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab?.url) return;

  const provider = detectProvider(tab.url);

  if (provider === "distrokid") {
    siteBadge.textContent = "DistroKid";
    siteBadge.className = "site-badge distrokid";
    importBtn.disabled = false;
    importBtn.textContent = "Import from DistroKid";
  } else if (provider === "soundon") {
    siteBadge.textContent = "SoundOn";
    siteBadge.className = "site-badge soundon";
    importBtn.disabled = false;
    importBtn.textContent = "Import from SoundOn";
  } else {
    siteBadge.textContent = "Not a supported distributor page";
    siteBadge.className = "site-badge unknown";
    importBtn.disabled = true;
    importBtn.textContent = "Navigate to DistroKid or SoundOn";
    showStatus(
      "Visit distrokid.com or sound.on.fm and navigate to your releases page, then click the extension.",
      "info"
    );
  }
});

// Import button
importBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) return;

    importBtn.disabled = true;
    importBtn.textContent = "Importing...";
    showStatus("Scanning page for releases...", "info");

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ["content.js"],
      },
      () => {
        if (chrome.runtime.lastError) {
          showStatus(`Error: ${chrome.runtime.lastError.message}`, "error");
          importBtn.disabled = false;
          importBtn.textContent = "Import to Artist Vault";
        }
      }
    );
  });
});

// Listen for results from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "IMPORT_RESULT") {
    importBtn.disabled = false;
    importBtn.textContent = "Import to Artist Vault";

    if (message.ok) {
      showStatus(
        `✅ ${message.releaseCount} release(s) imported successfully!${
          message.errors?.length ? `\n⚠️ ${message.errors.length} error(s): ${message.errors[0]}` : ""
        }`,
        "success"
      );
    } else {
      showStatus(`❌ Import failed: ${message.error ?? "Unknown error"}`, "error");
    }
  }
});

// Open vault button
openVaultBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://aiartistvault.com/vault" });
});
