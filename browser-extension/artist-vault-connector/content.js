/**
 * Artist Vault Browser Extension — content.js v3.0.0
 * Two-phase DistroKid scraper:
 *   Phase 1 (list page)  → collect release detail URLs
 *   Phase 2 (detail page) → scrape full release + tracks
 */

(function () {
  "use strict";
  const hostname = window.location.hostname;
  const path = window.location.pathname;

  if (hostname.includes("distrokid.com")) { handleDistroKid(); return; }
  if (hostname.includes("sound.on") || hostname.includes("soundon.fm")) { scrapeSoundOn(); return; }

  // ── DistroKid ──────────────────────────────────────────────────────────────
  function handleDistroKid() {
    // Phase 2: we are on a detail page — scrape and report back
    if (document.body.dataset.avPhase === "scrape") {
      const release = scrapeDetailPage();
      chrome.runtime.sendMessage({ type: "DETAIL_SCRAPED", release });
      return;
    }

    // Also handle message-triggered scrape (background opens tab and sends message)
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === "SCRAPE_DETAIL") {
        waitForContent(() => {
          const release = scrapeDetailPage();
          sendResponse({ release });
        });
        return true; // async
      }
      if (msg.type === "COLLECT_LINKS") {
        waitForContent(() => {
          const links = collectReleaseLinks();
          sendResponse({ links });
        });
        return true;
      }
    });

    // Phase 1: list page — collect links and trigger crawl
    waitForContent(() => {
      const links = collectReleaseLinks();
      if (links.length === 0) {
        showToast("⚠️ No release links found. Make sure you're on distrokid.com/mymusic");
        return;
      }
      showToast(`🔍 Found ${links.length} release(s). Crawling each page...`);
      chrome.runtime.sendMessage({ type: "CRAWL_RELEASES", links }, (response) => {
        showToast(response?.ok
          ? `✅ ${response.releaseCount} release(s) imported to Artist Vault!`
          : `❌ Import failed: ${response?.error ?? "Unknown error"}`
        );
      });
    });
  }

  function collectReleaseLinks() {
    const links = new Set();

    // Primary: anchor tags pointing to /manage or /releases detail pages
    document.querySelectorAll("a[href*='/manage/'], a[href*='/release/'], a[href*='/mymusic/']").forEach(a => {
      const href = a.href;
      if (href && href.includes("distrokid.com") &&
          (href.includes("/manage/") || href.match(/\/mymusic\/\d+/))) {
        links.add(href);
      }
    });

    // Secondary: rows with data-album-id — build the URL
    document.querySelectorAll("[data-album-id]").forEach(el => {
      const id = el.getAttribute("data-album-id");
      if (id) links.add(`https://distrokid.com/mymusic/${id}`);
    });

    // Tertiary: any link that has album art next to a title (card layout)
    document.querySelectorAll("a[href*='distrokid.com/mymusic']").forEach(a => {
      if (a.href) links.add(a.href);
    });

    // Also grab relative links to /mymusic/*
    document.querySelectorAll("a[href^='/mymusic/']").forEach(a => {
      links.add("https://distrokid.com" + a.getAttribute("href"));
    });

    // Filter out the base list pages
    const filtered = [...links].filter(url =>
      !url.match(/distrokid\.com\/mymusic\/?$/) &&
      !url.includes("/mymusic/videos") &&
      !url.includes("/mymusic/earnings")
    );

    return [...new Set(filtered)];
  }

  function scrapeDetailPage() {
    const url = window.location.href;

    // Title: h1 or the biggest heading on page
    const title =
      textOf(document.querySelector("h1")) ||
      textOf(document.querySelector("h2")) ||
      textOf(document.querySelector(".albumTitle, [class*='albumTitle'], [class*='album-title']")) ||
      "Unknown Release";

    // UPC
    const upcEl = findByLabel("UPC") || document.querySelector("[class*='upc'], [data-upc]");
    const upc = textOf(upcEl)?.replace(/\D/g, "") || extractPattern(document.body.innerText, /\bUPC[:\s]+(\d{12,13})/i);

    // Release date
    const dateEl = findByLabel("Release Date") || findByLabel("Date") ||
                   document.querySelector("time, [class*='releaseDate'], [class*='release-date']");
    const releaseDate = normalizeDate(dateEl?.getAttribute("datetime") || textOf(dateEl));

    // Artwork
    const artworkUrl = src(document.querySelector(".albumArt img, [class*='artwork'] img, [class*='cover'] img, .album-art img")) ||
                       src(document.querySelector("img[src*='amazonaws'], img[src*='cloudfront']"));

    // Store links
    const stores = [];
    document.querySelectorAll("a[href*='spotify.com/album'], a[href*='spotify.com/track']").forEach(a => stores.push({ name: "Spotify", url: a.href }));
    document.querySelectorAll("a[href*='music.apple.com']").forEach(a => stores.push({ name: "Apple Music", url: a.href }));
    document.querySelectorAll("a[href*='youtube.com'], a[href*='music.youtube.com']").forEach(a => stores.push({ name: "YouTube Music", url: a.href }));
    document.querySelectorAll("a[href*='tidal.com']").forEach(a => stores.push({ name: "Tidal", url: a.href }));
    document.querySelectorAll("a[href*='deezer.com']").forEach(a => stores.push({ name: "Deezer", url: a.href }));

    // Release ID from URL
    const releaseId = url.match(/\/(\d+)\/?$/)?.[1] ||
                      url.match(/manage\/(\w+)/)?.[1] ||
                      upc || generateId();

    // Artist name
    const artistEl = findByLabel("Artist") || document.querySelector("[class*='artistName'], [class*='artist-name']");
    const artistName = textOf(artistEl) || null;

    // Distributor / label
    const labelEl = findByLabel("Label") || findByLabel("Distributor");
    const labelName = textOf(labelEl) || "DistroKid";

    // Tracks — DistroKid detail pages list tracks in a table
    const tracks = [];
    const trackRows = document.querySelectorAll(
      "table tr[data-track-id], table tbody tr, .trackList tr, [class*='track-row'], [class*='trackRow']"
    );
    trackRows.forEach((row, idx) => {
      // skip header rows
      if (row.querySelector("th")) return;
      const cells = row.querySelectorAll("td");
      if (cells.length === 0) return;

      const tid = row.getAttribute("data-track-id") || `${releaseId}_t${idx}`;
      const tTitle = textOf(row.querySelector("[class*='trackTitle'], [class*='track-title']")) ||
                     textOf(cells[1]) || textOf(cells[0]) || `Track ${idx + 1}`;
      const isrcEl = row.querySelector("[class*='isrc'], [data-isrc]") || findByLabel("ISRC", row);
      const isrc = textOf(isrcEl)?.replace(/\s/g, "") ||
                   extractPattern(row.innerText, /[A-Z]{2}[A-Z0-9]{3}\d{7}/);
      const dur = textOf(row.querySelector("[class*='duration'], .time, [class*='time']")) || null;

      tracks.push({
        source_track_id: tid,
        track_number: idx + 1,
        title: tTitle,
        isrc: isrc || null,
        duration_text: dur,
        explicit: !!row.querySelector("[class*='explicit'], .explicit"),
      });
    });

    // If no tracks found in table, treat the release itself as a single track
    if (tracks.length === 0) {
      const isrc = extractPattern(document.body.innerText, /[A-Z]{2}[A-Z0-9]{3}\d{7}/);
      tracks.push({
        source_track_id: `${releaseId}_t0`,
        track_number: 1,
        title,
        isrc: isrc || null,
        duration_text: null,
        explicit: false,
      });
    }

    return {
      source_release_id: String(releaseId),
      title,
      artist_name: artistName,
      release_date: releaseDate,
      upc: upc || null,
      label_name: labelName,
      artwork_url: artworkUrl || null,
      source_url: url,
      stores: [...new Map(stores.map(s => [s.url, s])).values()],
      tracks,
      raw: { scraped_from: "distrokid", url, scraped_at: new Date().toISOString() },
    };
  }

  // ── SoundOn ────────────────────────────────────────────────────────────────
  function scrapeSoundOn() {
    const releases = [];

    document.querySelectorAll("table tbody tr").forEach((row, idx) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) return;
      const title = textOf(cells[0]) || textOf(cells[1]);
      if (!title || title.length < 2) return;
      const releaseId = row.getAttribute("data-id") || `so_${idx}`;
      const artworkUrl = src(row.querySelector("img"));
      const releaseDate = normalizeDate(textOf(cells[2]) || textOf(cells[3]));
      const upc = [...cells].map(c => textOf(c)).find(t => t && /^\d{12,13}$/.test(t.replace(/\s/, ""))) || null;
      releases.push(buildRelease(releaseId, title, releaseDate, upc, artworkUrl, [], "soundon"));
    });

    if (releases.length === 0) {
      document.querySelectorAll("[class*='release-item'],[class*='ReleaseItem'],[class*='AlbumCard']").forEach((card, idx) => {
        const title = textOf(card.querySelector("[class*='title'],[class*='Title'],h2,h3,strong"));
        if (!title) return;
        const releaseId = card.getAttribute("data-id") || `so_${idx}`;
        const artworkUrl = src(card.querySelector("img"));
        const releaseDate = normalizeDate(textOf(card.querySelector("[class*='date'],time")));
        const upc = textOf(card.querySelector("[class*='upc']"))?.replace(/\D/g, "") || null;
        releases.push(buildRelease(releaseId, title, releaseDate, upc, artworkUrl, [], "soundon"));
      });
    }

    if (releases.length === 0) {
      showToast("⚠️ No releases found. Navigate to your SoundOn music list and try again.");
      return;
    }

    chrome.runtime.sendMessage({ type: "START_IMPORT", provider: "soundon", data: { releases } }, (response) => {
      showToast(response?.ok
        ? `✅ ${response.releaseCount} release(s) imported to Artist Vault!`
        : `❌ Import failed: ${response?.error ?? "Unknown error"}`
      );
    });
  }

  // ── Shared helpers ─────────────────────────────────────────────────────────
  function buildRelease(id, title, releaseDate, upc, artworkUrl, tracks, provider) {
    return {
      source_release_id: String(id),
      title,
      artist_name: null,
      release_date: releaseDate,
      upc: upc || null,
      label_name: null,
      artwork_url: artworkUrl || null,
      source_url: window.location.href,
      stores: [],
      tracks,
      raw: { scraped_from: provider, url: window.location.href, scraped_at: new Date().toISOString() },
    };
  }

  function findByLabel(label, root = document) {
    const els = root.querySelectorAll("dt, th, label, [class*='label'], [class*='Label'], strong, b");
    for (const el of els) {
      if (el.textContent?.trim().toLowerCase().includes(label.toLowerCase())) {
        return el.nextElementSibling || el.parentElement?.querySelector("dd, td, span, p");
      }
    }
    return null;
  }

  function extractPattern(text, regex) {
    return text?.match(regex)?.[1] || text?.match(regex)?.[0] || null;
  }

  function waitForContent(cb, maxWait = 8000) {
    const start = Date.now();
    const check = () => {
      const hasContent = document.querySelectorAll("a, tr, [data-album-id]").length > 3;
      if (hasContent || Date.now() - start > maxWait) { cb(); return; }
      setTimeout(check, 300);
    };
    if (document.readyState === "complete") { check(); } else {
      window.addEventListener("load", check, { once: true });
    }
  }

  function textOf(el) {
    if (!el) return null;
    const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    return t.length > 0 ? t : null;
  }

  function src(el) {
    if (!el) return null;
    return el.getAttribute("src") || el.getAttribute("data-src") || null;
  }

  function normalizeDate(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  function generateId() {
    return "gen_" + Math.random().toString(36).slice(2, 10);
  }

  function showToast(msg) {
    const existing = document.getElementById("av-toast");
    if (existing) existing.remove();
    const el = document.createElement("div");
    el.id = "av-toast";
    el.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:999999;background:#1a1a2e;color:#fff;padding:14px 20px;border-radius:10px;font-family:sans-serif;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,.5);max-width:340px;line-height:1.4;border-left:4px solid #7c3aed";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }
})();
