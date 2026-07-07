/**
 * Artist Vault Browser Extension — background.js v3.1.0
 */

const CRAWL_DELAY_MS = 1200;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  // Popup clicks "Start Import" — has a session token already from the vault page
  if (message.type === "AV_START_IMPORT") {
    const { vaultBaseUrl, sessionToken } = message;
    chrome.storage.local.set({ avImportStatus: "Finding releases on DistroKid..." });

    // Find the active DistroKid tab and tell content.js to collect links
    chrome.tabs.query({ url: "https://distrokid.com/*" }, (tabs) => {
      if (!tabs.length) {
        chrome.storage.local.set({ avImportStatus: "No DistroKid tab found. Open distrokid.com/mymusic first." });
        sendResponse({ message: "No DistroKid tab found. Open distrokid.com/mymusic first." });
        return;
      }

      const tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, { type: "COLLECT_LINKS" }, (res) => {
        const links = res?.links || [];
        if (!links.length) {
          chrome.storage.local.set({ avImportStatus: "No release links found on this page. Navigate to distrokid.com/mymusic" });
          sendResponse({ message: "No release links found. Make sure you're on distrokid.com/mymusic" });
          return;
        }
        // Start crawling
        crawlAndPush(links, vaultBaseUrl, sessionToken)
          .then(result => {
            chrome.storage.local.set({ avImportStatus: `✅ Done! ${result.releaseCount} release(s) imported.` });
            sendResponse({ message: `✅ Done! ${result.releaseCount} release(s) imported.` });
          })
          .catch(err => {
            chrome.storage.local.set({ avImportStatus: `❌ ${err.message}` });
            sendResponse({ message: `❌ ${err.message}` });
          });
      });
    });
    return true; // async
  }

  // content.js found links and wants us to crawl (fallback path)
  if (message.type === "CRAWL_RELEASES") {
    chrome.storage.local.get(["avVaultBaseUrl", "avSessionToken"], (stored) => {
      const vaultBaseUrl = stored.avVaultBaseUrl || "https://aiartistvault.com";
      const sessionToken = stored.avSessionToken || "";

      if (!sessionToken) {
        sendResponse({ ok: false, error: "No session token. Generate one in Artist Vault first." });
        return;
      }

      crawlAndPush(message.links, vaultBaseUrl, sessionToken)
        .then(result => sendResponse({ ok: true, releaseCount: result.releaseCount }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
    });
    return true;
  }

  // Direct import (SoundOn or pre-scraped data)
  if (message.type === "START_IMPORT") {
    chrome.storage.local.get(["avVaultBaseUrl", "avSessionToken"], (stored) => {
      const vaultBaseUrl = stored.avVaultBaseUrl || "https://aiartistvault.com";
      const sessionToken = stored.avSessionToken || "";

      if (!sessionToken) {
        sendResponse({ ok: false, error: "No session token." });
        return;
      }

      pushToVault(vaultBaseUrl, sessionToken, message.data.releases)
        .then(result => sendResponse({ ok: true, releaseCount: result.releaseCount }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
    });
    return true;
  }

  if (message.type === "GET_TOKEN") {
    chrome.storage.local.get(["avSessionToken"], (res) => {
      sendResponse({ token: res.avSessionToken ?? null });
    });
    return true;
  }
});

async function crawlAndPush(links, vaultBaseUrl, sessionToken) {
  const releases = [];

  chrome.storage.local.set({ avImportStatus: `Crawling 0 / ${links.length} releases...` });

  for (let i = 0; i < links.length; i++) {
    try {
      const release = await scrapeInTab(links[i]);
      if (release) releases.push(release);
    } catch (e) {
      console.warn("[AV] scrape failed:", links[i], e.message);
    }
    chrome.storage.local.set({ avImportStatus: `Crawling ${i + 1} / ${links.length} releases...` });
    if (i < links.length - 1) await sleep(CRAWL_DELAY_MS);
  }

  if (!releases.length) throw new Error("No releases could be scraped.");

  return await pushToVault(vaultBaseUrl, sessionToken, releases);
}

async function scrapeInTab(url) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      const tabId = tab.id;
      const timeout = setTimeout(() => {
        chrome.tabs.remove(tabId).catch(() => {});
        resolve(null);
      }, 15000);

      const onUpdated = (updatedId, info) => {
        if (updatedId !== tabId || info.status !== "complete") return;
        chrome.tabs.onUpdated.removeListener(onUpdated);

        chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { type: "SCRAPE_DETAIL" }, (response) => {
              clearTimeout(timeout);
              chrome.tabs.remove(tabId).catch(() => {});
              resolve(response?.release || null);
            });
          }, 1000);
        });
      };

      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

async function pushToVault(vaultBaseUrl, sessionToken, releases) {
  const pushRes = await fetch(`${vaultBaseUrl}/api/import/distrokid/push`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "distrokid", session_token: sessionToken, releases }),
  });

  if (!pushRes.ok) {
    const err = await pushRes.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `Push failed (${pushRes.status})`);
  }

  const result = await pushRes.json();
  return { releaseCount: result.release_count ?? result.releaseCount ?? releases.length };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
