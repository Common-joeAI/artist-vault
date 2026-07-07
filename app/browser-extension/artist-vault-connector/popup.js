const importBtn = document.getElementById("importBtn");
const openVaultBtn = document.getElementById("openVault");
const siteBadge = document.getElementById("siteBadge");
const statusEl = document.getElementById("status");
const tokenEl = document.getElementById("tokenValue");
const tokenBox = document.getElementById("tokenDisplay");

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

// Show any token already in storage
chrome.storage.local.get(["av_session_token", "av_import_status", "av_release_count", "av_error"], (res) => {
  if (res.av_session_token && tokenEl) {
    tokenEl.textContent = res.av_session_token;
    tokenEl.style.display = "block";
    if (tokenBox) tokenBox.style.display = "block";
  }
  if (res.av_import_status === "done" && res.av_release_count > 0) {
    showStatus(`✅ Last import: ${res.av_release_count} release(s) pushed to vault`, "success");
  } else if (res.av_import_status === "error" && res.av_error) {
    showStatus(`❌ Last error: ${res.av_error}`, "error");
  }
});

// Detect current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab?.url) return;

  const provider = detectProvider(tab.url);

  if (provider === "distrokid") {
    siteBadge.textContent = "DistroKid ✓";
    siteBadge.className = "site-badge distrokid";
    importBtn.disabled = false;
    importBtn.textContent = "Import from DistroKid";
  } else if (provider === "soundon") {
    siteBadge.textContent = "SoundOn ✓";
    siteBadge.className = "site-badge soundon";
    importBtn.disabled = false;
    importBtn.textContent = "Import from SoundOn";
  } else {
    siteBadge.textContent = "Not on a supported distributor page";
    siteBadge.className = "site-badge unknown";
    importBtn.disabled = true;
    importBtn.textContent = "Go to DistroKid or SoundOn first";
    showStatus(
      "Navigate to distrokid.com (your music list) or sound.on.fm, then click the extension icon.",
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
    importBtn.textContent = "Scanning page...";
    showStatus("Scanning for releases on this page...", "info");

    // Clear old token display
    if (tokenEl) { tokenEl.textContent = ""; tokenEl.style.display = "none";
      if (tokenBox) tokenBox.style.display = "none"; }
    chrome.storage.local.remove(["av_session_token", "av_import_status", "av_release_count", "av_error"]);

    chrome.scripting.executeScript(
      { target: { tabId: tab.id }, files: ["content.js"] },
      () => {
        if (chrome.runtime.lastError) {
          showStatus(`Error injecting script: ${chrome.runtime.lastError.message}`, "error");
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
    importBtn.textContent = message.ok ? "Import again" : "Retry import";

    if (message.ok) {
      showStatus(`✅ ${message.releaseCount} release(s) imported!`, "success");
      // Show token
      chrome.storage.local.get(["av_session_token"], (res) => {
        if (res.av_session_token && tokenEl) {
          tokenEl.textContent = res.av_session_token;
          tokenEl.style.display = "block";
    if (tokenBox) tokenBox.style.display = "block";
        }
      });
    } else {
      showStatus(`❌ Import failed: ${message.error ?? "Unknown error"}`, "error");
    }
  }
});

// Copy token
const copyBtn = document.getElementById("copyToken");
if (copyBtn) {
  copyBtn.addEventListener("click", () => {
    const t = tokenEl?.textContent?.trim();
    if (!t) return;
    navigator.clipboard.writeText(t).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy token"; }, 1500);
    });
  });
}

// Open vault button
openVaultBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://aiartistvault.com/vault/import" });
});
