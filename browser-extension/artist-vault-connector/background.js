chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "AV_START_IMPORT") {
    return;
  }

  startImport(message, sender)
    .then((result) => sendResponse(result))
    .catch((error) => {
      const messageText = error instanceof Error ? error.message : "Import failed.";
      chrome.storage.local.set({ avImportStatus: messageText });
      sendResponse({ ok: false, message: messageText });
    });

  return true;
});

async function startImport(message, sender) {
  const baseUrl = normalizeBaseUrl(message.vaultBaseUrl || message.baseUrl || message.vaultOrigin || "https://aiartistvault.com");
  const sessionToken = String(message.sessionToken || message.token || "").trim();

  if (!sessionToken) {
    throw new Error("Missing import token.");
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tab || sender?.tab;

  if (!activeTab?.id) {
    throw new Error("No active DistroKid tab found.");
  }

  await chrome.storage.local.set({ avImportStatus: "Finding DistroKid releases..." });

  const discovery = await sendTabMessage(activeTab.id, { type: "AV_DISCOVER_RELEASES" });
  let releaseLinks = Array.isArray(discovery?.releaseLinks) ? unique(discovery.releaseLinks) : [];

  if (!releaseLinks.length && activeTab.url && /albumuuid=/i.test(activeTab.url)) {
    releaseLinks = [activeTab.url];
  }

  if (!releaseLinks.length) {
    throw new Error("No DistroKid release links were found. Open either your DistroKid release list or an individual album page, then try again.");
  }

  const releases = [];
  const errors = [];

  for (let index = 0; index < releaseLinks.length; index += 1) {
    const releaseUrl = releaseLinks[index];

    await chrome.storage.local.set({
      avImportStatus: `Scraping release ${index + 1} of ${releaseLinks.length}...`
    });

    try {
      const release = await scrapeReleaseInTab(releaseUrl);
      releases.push(release);
    } catch (error) {
      errors.push(`${releaseUrl}: ${error instanceof Error ? error.message : "Unknown scrape error."}`);
    }
  }

  if (!releases.length) {
    throw new Error(errors.length ? errors.join("\n") : "No releases could be scraped.");
  }

  await chrome.storage.local.set({
    avImportStatus: `Sending ${releases.length} release(s) to Artist Vault...`
  });

  const response = await fetch(`${baseUrl}/api/import/distrokid/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_token: sessionToken,
      sessionToken,
      provider: "distrokid",
      releases,
      errors
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Artist Vault returned ${response.status}.`);
  }

  const statusMessage = data?.message || `Import complete. Sent ${releases.length} release(s).`;

  await chrome.storage.local.set({
    avImportStatus: statusMessage
  });

  return {
    ok: true,
    message: statusMessage,
    releasesImported: releases.length,
    errors
  };
}

async function scrapeReleaseInTab(releaseUrl) {
  const tab = await chrome.tabs.create({
    url: releaseUrl,
    active: false
  });

  if (!tab.id) {
    throw new Error("Could not open release tab.");
  }

  try {
    await waitForTabComplete(tab.id);
    await sleep(2500);

    const scraped = await sendTabMessage(tab.id, { type: "AV_SCRAPE_RELEASE_PAGE" });

    if (scraped?.error) {
      throw new Error(scraped.error);
    }

    if (!scraped?.source_release_id) {
      throw new Error("Release page returned no release ID.");
    }

    return scraped;
  } finally {
    chrome.tabs.remove(tab.id).catch(() => undefined);
  }
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function waitForTabComplete(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Timed out waiting for DistroKid page to load."));
    }, 30000);

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) return;

      if (tab?.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

function normalizeBaseUrl(value) {
  let raw = String(value || "").trim();

  if (!raw) {
    raw = "https://aiartistvault.com";
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
    return "https://aiartistvault.com";
  }
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
