/**
 * Artist Vault Browser Extension — content.js
 * Scrapes release data from DistroKid and SoundOn pages.
 */

(function () {
  const hostname = window.location.hostname;

  // ── DistroKid ────────────────────────────────────────────────────────────

  if (hostname.includes("distrokid.com")) {
    scrapeDistroKid();
    return;
  }

  // ── SoundOn ──────────────────────────────────────────────────────────────

  if (hostname.includes("sound.on") || hostname.includes("soundon")) {
    scrapeSoundOn();
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────

  function scrapeDistroKid() {
    const releases = [];

    // DistroKid album rows
    document.querySelectorAll(".albumRow, [data-album-id], .release-row").forEach((row) => {
      const releaseId = row.dataset.albumId ?? row.dataset.releaseId ?? generateId();
      const title = text(row.querySelector(".albumTitle, .release-title, h2, h3"));
      if (!title) return;

      const artworkUrl = src(row.querySelector("img.albumArt, img.cover-art, img"));
      const releaseDate = text(row.querySelector(".releaseDate, .release-date, [data-release-date]"));
      const upc = text(row.querySelector(".upc, [data-upc]"));

      const tracks = [];
      row.querySelectorAll(".trackRow, .track-row, tr[data-track-id]").forEach((trackRow, idx) => {
        const trackId = trackRow.dataset.trackId ?? `${releaseId}_t${idx}`;
        const trackTitle = text(trackRow.querySelector(".trackTitle, .track-title, td:first-child"));
        const isrc = text(trackRow.querySelector(".isrc, [data-isrc]"));
        const duration = text(trackRow.querySelector(".duration, [data-duration]"));
        const explicit = trackRow.querySelector(".explicit, [data-explicit='true']") !== null;

        tracks.push({
          source_track_id: trackId,
          track_number: idx + 1,
          title: trackTitle ?? `Track ${idx + 1}`,
          isrc: isrc ?? null,
          duration_text: duration ?? null,
          explicit,
        });
      });

      // Collect store links
      const stores = [];
      row.querySelectorAll("a[href*='spotify.com']").forEach((a) => {
        stores.push({ name: "Spotify", url: a.href });
      });
      row.querySelectorAll("a[href*='music.apple.com']").forEach((a) => {
        stores.push({ name: "Apple Music", url: a.href });
      });
      row.querySelectorAll("a[href*='youtube.com']").forEach((a) => {
        stores.push({ name: "YouTube Music", url: a.href });
      });

      releases.push({
        source_release_id: releaseId,
        title,
        artist_name: null, // populated from profile
        release_date: normalizeDate(releaseDate),
        upc: upc ?? null,
        label_name: null,
        artwork_url: artworkUrl ?? null,
        source_url: window.location.href,
        stores,
        tracks,
        raw: { scraped_from: "distrokid", url: window.location.href },
      });
    });

    if (releases.length > 0) {
      chrome.runtime.sendMessage({
        type: "START_IMPORT",
        provider: "distrokid",
        data: { releases },
      }, (response) => {
        showToast(response?.ok
          ? `✅ ${response.releaseCount} release(s) imported to Artist Vault!`
          : `❌ Import failed: ${response?.error ?? "Unknown error"}`
        );
      });
    } else {
      showToast("⚠️ No releases found on this DistroKid page. Navigate to your music list.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  function scrapeSoundOn() {
    const releases = [];

    // SoundOn release cards / rows
    // Selectors are based on SoundOn's typical DOM structure
    const releaseContainers = document.querySelectorAll(
      "[class*='release'], [class*='album'], [class*='track-item'], .music-item, .release-card"
    );

    releaseContainers.forEach((container, idx) => {
      const releaseId = container.dataset.id ?? container.dataset.releaseId ?? `so_${idx}`;
      const title = text(
        container.querySelector("[class*='title'], h2, h3, .release-name, .album-name")
      );
      if (!title) return;

      const artworkUrl = src(container.querySelector("img"));
      const releaseDate = text(
        container.querySelector("[class*='date'], .release-date, time")
      );
      const upc = text(container.querySelector("[class*='upc'], .upc"));

      const tracks = [];
      container.querySelectorAll("[class*='track'], .track-row, li[class*='song']").forEach((trackEl, tIdx) => {
        tracks.push({
          source_track_id: trackEl.dataset.id ?? `${releaseId}_t${tIdx}`,
          track_number: tIdx + 1,
          title: text(trackEl.querySelector("[class*='title'], .track-name")) ?? `Track ${tIdx + 1}`,
          isrc: text(trackEl.querySelector("[class*='isrc']")) ?? null,
          duration_text: text(trackEl.querySelector("[class*='duration'], .time")) ?? null,
          explicit: trackEl.querySelector("[class*='explicit']") !== null,
        });
      });

      const stores = [];
      container.querySelectorAll("a[href*='spotify']").forEach((a) =>
        stores.push({ name: "Spotify", url: a.href })
      );
      container.querySelectorAll("a[href*='apple']").forEach((a) =>
        stores.push({ name: "Apple Music", url: a.href })
      );
      container.querySelectorAll("a[href*='youtube']").forEach((a) =>
        stores.push({ name: "YouTube", url: a.href })
      );

      releases.push({
        source_release_id: releaseId,
        title,
        artist_name: null,
        release_date: normalizeDate(releaseDate),
        upc: upc ?? null,
        label_name: null,
        artwork_url: artworkUrl ?? null,
        source_url: window.location.href,
        stores,
        tracks,
        raw: { scraped_from: "soundon", url: window.location.href },
      });
    });

    if (releases.length > 0) {
      chrome.runtime.sendMessage({
        type: "START_IMPORT",
        provider: "soundon",
        data: { releases },
      }, (response) => {
        showToast(response?.ok
          ? `✅ ${response.releaseCount} release(s) imported to Artist Vault!`
          : `❌ Import failed: ${response?.error ?? "Unknown error"}`
        );
      });
    } else {
      showToast("⚠️ No releases found on this SoundOn page. Navigate to your music/releases section.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DOM helpers
  // ─────────────────────────────────────────────────────────────────────────

  function text(el) {
    if (!el) return null;
    const t = (el.textContent ?? el.innerText ?? "").replace(/\s+/g, " ").trim();
    return t || null;
  }

  function src(el) {
    if (!el) return null;
    return el.src || el.dataset.src || null;
  }

  function generateId() {
    return `ext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 999999;
      background: #1a1a2e; color: #fff; padding: 14px 20px;
      border-radius: 8px; font-family: sans-serif; font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4); max-width: 360px;
      border-left: 4px solid ${message.startsWith("✅") ? "#22c55e" : message.startsWith("⚠️") ? "#f59e0b" : "#ef4444"};
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }
})();
