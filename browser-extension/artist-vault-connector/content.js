chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "AV_GET_VAULT_TOKEN") {
    sendResponse(getVaultToken());
    return;
  }

  if (message?.type === "AV_DISCOVER_RELEASES") {
    sendResponse({
      releaseLinks: discoverReleaseLinks()
    });
    return;
  }

  if (message?.type === "AV_SCRAPE_RELEASE_PAGE") {
    try {
      sendResponse(scrapeReleasePage());
    } catch (error) {
      sendResponse({
        error: error instanceof Error ? error.message : "Unknown scrape error."
      });
    }
  }
});

function discoverReleaseLinks() {
  const anchors = Array.from(document.querySelectorAll("a[href*='albumuuid=']"));
  const links = anchors
    .map((anchor) => {
      const href = anchor.getAttribute("href") || "";
      try {
        return new URL(href, window.location.origin).toString();
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return [...new Set(links)];
}

function scrapeReleasePage() {
  const sourceUrl = window.location.href;
  const sourceReleaseId = extractAlbumUuid(sourceUrl);
  if (!sourceReleaseId) {
    throw new Error("Could not detect albumuuid on this page.");
  }

  const documentText = getDocumentText();
  const headingTitle = pickHeadingTitle();
  const title = clean(
    headingTitle ||
    findLabelValue(documentText, [
      /album title\s*[:\-]\s*(.+)/i,
      /release title\s*[:\-]\s*(.+)/i
    ]) ||
    document.title.replace(/\s*[\-|–—].*$/, "")
  );

  const artistName = clean(
    findLabelValue(documentText, [
      /artist name\s*[:\-]\s*(.+)/i,
      /primary artist\s*[:\-]\s*(.+)/i
    ])
  );

  const upc = clean(
    findLabelValue(documentText, [
      /\bupc\s*[:\-]\s*([A-Z0-9\-]+)/i
    ])
  );

  const labelName = clean(
    findLabelValue(documentText, [
      /label\s*[:\-]\s*(.+)/i
    ])
  );

  const releaseDate = normalizeDate(
    findLabelValue(documentText, [
      /release date\s*[:\-]\s*([^\n]+)/i,
      /original release date\s*[:\-]\s*([^\n]+)/i
    ])
  );

  const tracks = scrapeTracks();
  const stores = scrapeStoreLinks();

  return {
    source_release_id: sourceReleaseId,
    title: title || `Release ${sourceReleaseId}`,
    artist_name: artistName || null,
    release_date: releaseDate,
    upc: upc || null,
    label_name: labelName || null,
    artwork_url: scrapeArtworkUrl(),
    source_url: sourceUrl,
    stores,
    tracks,
    raw: {
      scraped_at: new Date().toISOString(),
      page_title: document.title
    }
  };
}

function scrapeTracks() {
  const rows = Array.from(document.querySelectorAll("table tr"));
  const parsedFromRows = [];

  for (const row of rows) {
    const text = clean(row.innerText);
    if (!text) continue;

    const isrcMatch = text.match(/\b([A-Z]{2}[A-Z0-9]{3}\d{7})\b/);
    if (!isrcMatch) continue;

    const cells = Array.from(row.querySelectorAll("th, td"))
      .map((cell) => clean(cell.innerText))
      .filter(Boolean);

    const trackNumber = guessTrackNumber(cells, text);
    const durationText = guessDuration(cells, text);
    const title = guessTrackTitle(cells, isrcMatch[1], trackNumber) || `Track ${trackNumber || parsedFromRows.length + 1}`;

    parsedFromRows.push({
      source_track_id: String(trackNumber || parsedFromRows.length + 1),
      track_number: trackNumber,
      title,
      isrc: isrcMatch[1],
      duration_text: durationText,
      explicit: /\bexplicit\b/i.test(text) ? true : /\bclean\b/i.test(text) ? false : null
    });
  }

  if (parsedFromRows.length) {
    return dedupeTracks(parsedFromRows);
  }

  const lines = getDocumentText().split("\n").map(clean).filter(Boolean);
  const parsedFromText = [];

  for (const line of lines) {
    const isrcMatch = line.match(/\b([A-Z]{2}[A-Z0-9]{3}\d{7})\b/);
    if (!isrcMatch) continue;

    const numberMatch = line.match(/^\s*(\d{1,2})[.)\-\s]+/);
    const trackNumber = numberMatch ? Number.parseInt(numberMatch[1], 10) : parsedFromText.length + 1;
    const withoutIsrc = clean(line.replace(isrcMatch[1], ""));
    const title = withoutIsrc ? withoutIsrc.replace(/^\d{1,2}[.)\-\s]+/, "").trim() : `Track ${trackNumber}`;

    parsedFromText.push({
      source_track_id: String(trackNumber),
      track_number: trackNumber,
      title: title || `Track ${trackNumber}`,
      isrc: isrcMatch[1],
      duration_text: null,
      explicit: /\bexplicit\b/i.test(line) ? true : /\bclean\b/i.test(line) ? false : null
    });
  }

  return dedupeTracks(parsedFromText);
}

function dedupeTracks(tracks) {
  const map = new Map();
  for (const track of tracks) {
    const key = track.isrc || track.source_track_id;
    if (!map.has(key)) {
      map.set(key, track);
    }
  }
  return [...map.values()];
}

function scrapeStoreLinks() {
  const allowed = [
    { name: "Spotify", match: /spotify\.com/i },
    { name: "Apple Music", match: /music\.apple\.com|itunes\.apple\.com/i },
    { name: "YouTube", match: /youtube\.com|youtu\.be/i },
    { name: "Amazon Music", match: /amazon\./i },
    { name: "TikTok", match: /tiktok\.com/i },
    { name: "Pandora", match: /pandora\.com/i }
  ];

  const items = [];

  for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
    const href = anchor.href;
    if (!href) continue;

    const match = allowed.find((entry) => entry.match.test(href));
    if (!match) continue;

    items.push({
      name: match.name,
      url: href
    });
  }

  const unique = new Map();
  for (const item of items) {
    unique.set(`${item.name}::${item.url}`, item);
  }

  return [...unique.values()];
}

function scrapeArtworkUrl() {
  const images = Array.from(document.querySelectorAll("img[src]"))
    .map((img) => ({
      src: img.src,
      width: img.naturalWidth || img.width || 0,
      height: img.naturalHeight || img.height || 0,
      alt: clean(img.alt) || ""
    }))
    .filter((img) => /^https?:/i.test(img.src));

  const preferred = images
    .sort((a, b) => areaScore(b) - areaScore(a))
    .find((img) => /cover|art|album|release/i.test(img.alt) || img.width >= 250 || img.height >= 250);

  return preferred ? preferred.src : null;
}

function areaScore(image) {
  return (image.width || 0) * (image.height || 0);
}

function guessTrackNumber(cells, text) {
  for (const cell of cells) {
    const match = String(cell).match(/^\d{1,2}$/);
    if (match) return Number.parseInt(match[0], 10);
  }
  const fallback = text.match(/^\s*(\d{1,2})[.)\-\s]/);
  return fallback ? Number.parseInt(fallback[1], 10) : null;
}

function guessDuration(cells, text) {
  const values = [...cells, text];
  for (const value of values) {
    const match = String(value).match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
    if (match) return match[1];
  }
  return null;
}

function guessTrackTitle(cells, isrc, trackNumber) {
  const candidates = cells
    .map((cell) => clean(String(cell)))
    .filter(Boolean)
    .filter((value) => value !== isrc)
    .filter((value) => !/^\d{1,2}$/.test(value))
    .filter((value) => !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value))
    .filter((value) => !/^(explicit|clean)$/i.test(value));

  if (!candidates.length) return null;

  const best = candidates.find((value) => !/isrc/i.test(value)) || candidates[0];
  if (!best) return null;

  return clean(best.replace(new RegExp(`^${trackNumber}[.)\\-\\s]+`), ""));
}

function pickHeadingTitle() {
  const heading = document.querySelector("h1, h2");
  return clean(heading?.textContent || "");
}

function extractAlbumUuid(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("albumuuid");
  } catch {
    return null;
  }
}

function findLabelValue(text, regexes) {
  for (const regex of regexes) {
    const match = text.match(regex);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function getDocumentText() {
  return (document.body?.innerText || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clean(value) {
  if (!value) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || null;
}


function getVaultToken() {
  const storageKeys = [
    "artistVaultDistroKidImportSession",
    "avDistroKidImportSession",
    "distrokidImportSession"
  ];

  for (const key of storageKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const sessionToken = parsed.session_token || parsed.sessionToken || parsed.token;
      const expiresAt = parsed.expires_at || parsed.expiresAt || null;

      if (sessionToken) {
        return {
          ok: true,
          sessionToken,
          expiresAt,
          source: `localStorage:${key}`
        };
      }
    } catch (_error) {
      // Continue checking other keys.
    }
  }

  const tokenEl = document.querySelector("[data-artist-vault-distrokid-token]");
  const sessionToken = tokenEl?.getAttribute("data-artist-vault-distrokid-token") || tokenEl?.textContent?.trim();

  if (sessionToken) {
    return {
      ok: true,
      sessionToken,
      expiresAt: null,
      source: "dom"
    };
  }

  return {
    ok: false,
    sessionToken: null,
    expiresAt: null,
    source: null
  };
}
