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
  const links = new Set();

  const current = normalizeDistroKidAlbumUrl(window.location.href);
  if (current) {
    links.add(current);
  }

  for (const anchor of Array.from(document.querySelectorAll("a[href*='albumuuid=']"))) {
    const href = anchor.getAttribute("href") || "";

    try {
      const absolute = new URL(href, window.location.origin).toString();
      const normalized = normalizeDistroKidAlbumUrl(absolute);

      if (normalized) {
        links.add(normalized);
      }
    } catch (_error) {
      // Ignore malformed links.
    }
  }

  return [...links];
}

function normalizeDistroKidAlbumUrl(url) {
  try {
    const parsed = new URL(url);
    const albumuuid = parsed.searchParams.get("albumuuid") || parsed.searchParams.get("id");

    if (!albumuuid) return null;

    return `https://distrokid.com/dashboard/album/?albumuuid=${encodeURIComponent(albumuuid)}`;
  } catch (_error) {
    return null;
  }
}

function scrapeReleasePage() {
  const sourceUrl = window.location.href;
  const sourceReleaseId = extractAlbumUuid(sourceUrl);

  if (!sourceReleaseId) {
    throw new Error("Could not detect albumuuid on this page.");
  }

  const title =
    textOf(".album-title span") ||
    metaContent("property", "og:title")?.replace(/\s+by\s+.+$/i, "") ||
    document.title.replace(/\s*-\s*DistroKid\s*$/i, "").replace(/^.+?\s+-\s+/, "");

  const artistName =
    textOf(".band-name span") ||
    parseArtistFromOgDescription() ||
    null;

  const releaseDate =
    normalizeDate(findReleaseInfoValue("Release date")) ||
    normalizeDateFromOgDescription();

  const upc =
    textOf("#js-album-upc") ||
    findReleaseInfoValue("DistroKid UPC") ||
    null;

  const genre =
    document.querySelector("#page-data")?.getAttribute("data-album-genre-primary") ||
    null;

  const tracks = scrapeTracks();

  const cleanedTitle = clean(title);

  if (!cleanedTitle || cleanedTitle === "Mobile App") {
    throw new Error("DistroKid album title was not found. Wait for the album page to fully load, then try again.");
  }

  if (!tracks.length) {
    throw new Error("No track rows were found on this DistroKid album page. Open the full desktop album dashboard page, wait for tracks to appear, then try again.");
  }

  return {
    source_release_id: sourceReleaseId,
    title: cleanedTitle || `Release ${sourceReleaseId}`,
    artist_name: clean(artistName),
    release_date: releaseDate,
    upc: clean(upc),
    label_name: null,
    artwork_url: scrapeArtworkUrl(),
    source_url: sourceUrl,
    genre: clean(genre),
    stores: scrapeStoreLinks(),
    tracks,
    raw: {
      scraped_at: new Date().toISOString(),
      page_title: document.title,
      scraper: "distrokid-dashboard-dom-v3",
      debug: {
        album_title_count: document.querySelectorAll(".album-title span").length,
        band_name_count: document.querySelectorAll(".band-name span").length,
        track_row_count: document.querySelectorAll(".track-row").length,
        body_text_sample: getDocumentText().slice(0, 1200)
      }
    }
  };
}

function scrapeTracks() {
  const rows = Array.from(document.querySelectorAll(".track-row"));
  const tracks = [];

  for (const row of rows) {
    const trackNumber = normalizeInteger(textOfFrom(row, ".track-number, .track-cell:first-child"));
    const title =
      textOfFrom(row, ".track-name") ||
      guessTitleFromTrackRow(row, trackNumber) ||
      `Track ${tracks.length + 1}`;

    const isrc =
      textOfFrom(row, ".isrc-value") ||
      findIsrc(row.innerText);

    tracks.push({
      source_track_id: String(trackNumber || tracks.length + 1),
      track_number: trackNumber || tracks.length + 1,
      title: clean(title) || `Track ${tracks.length + 1}`,
      isrc: clean(isrc),
      duration_text: null,
      explicit: inferExplicit(row.innerText)
    });
  }

  if (tracks.length) {
    return dedupeTracks(tracks);
  }

  return scrapeTracksFromTextFallback();
}

function scrapeTracksFromTextFallback() {
  const text = getDocumentText();
  const lines = text.split("\n").map(clean).filter(Boolean);
  const tracks = [];

  for (const line of lines) {
    const isrc = findIsrc(line);
    if (!isrc) continue;

    const withoutIsrc = clean(line.replace(isrc, ""));
    const numberMatch = withoutIsrc?.match(/^(\d{1,2})\s+(.+)$/);
    const trackNumber = numberMatch ? Number.parseInt(numberMatch[1], 10) : tracks.length + 1;

    let title = numberMatch ? numberMatch[2] : withoutIsrc;
    title = title
      ?.replace(/\bPlain lyrics\b.*$/i, "")
      ?.replace(/\bSynced lyrics\b.*$/i, "")
      ?.replace(/\bCredits\b.*$/i, "")
      ?.replace(/\bVizy\b.*$/i, "")
      ?.replace(/\bAudio Swap\b.*$/i, "")
      ?.replace(/\bDownload\b.*$/i, "")
      ?.replace(/\bISRC\b.*$/i, "");

    tracks.push({
      source_track_id: String(trackNumber),
      track_number: trackNumber,
      title: clean(title) || `Track ${trackNumber}`,
      isrc,
      duration_text: null,
      explicit: inferExplicit(line)
    });
  }

  return dedupeTracks(tracks);
}

function guessTitleFromTrackRow(row, trackNumber) {
  const cells = Array.from(row.querySelectorAll(".track-cell"))
    .map((cell) => clean(cell.innerText))
    .filter(Boolean);

  for (const cell of cells) {
    if (String(cell) === String(trackNumber)) continue;
    if (/^(Plain lyrics|Synced lyrics|Credits|Vizy|Audio Swap|Download|ISRC)$/i.test(cell)) continue;
    if (findIsrc(cell)) continue;
    return cell;
  }

  return null;
}

function dedupeTracks(tracks) {
  const unique = new Map();

  for (const track of tracks) {
    const key = track.isrc || `${track.track_number}:${track.title}`;

    if (!unique.has(key)) {
      unique.set(key, track);
    }
  }

  return [...unique.values()];
}

function findReleaseInfoValue(label) {
  const wanted = label.toLowerCase().replace(/:$/, "");

  for (const item of Array.from(document.querySelectorAll(".release-info div"))) {
    const spans = Array.from(item.querySelectorAll("span")).map((span) => clean(span.innerText));

    if (spans.length >= 2) {
      const foundLabel = String(spans[0] || "").toLowerCase().replace(/:$/, "");

      if (foundLabel === wanted) {
        return spans.slice(1).join(" ").trim();
      }
    }

    const text = clean(item.innerText);
    const regex = new RegExp(`${escapeRegExp(label)}\\s*:?\\s*(.+)$`, "i");
    const match = text?.match(regex);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function scrapeStoreLinks() {
  const stores = [];
  const seen = new Set();

  const allowed = [
    { name: "Spotify", match: /spotify/i },
    { name: "Apple Music", match: /apple\s*music|itunes/i },
    { name: "YouTube Music", match: /youtube\s*music|youtube/i },
    { name: "Amazon Music", match: /amazon/i },
    { name: "TikTok", match: /tiktok|bytedance/i },
    { name: "Pandora", match: /pandora/i },
    { name: "Deezer", match: /deezer/i },
    { name: "Tidal", match: /tidal/i },
    { name: "iHeartRadio", match: /iheart/i }
  ];

  for (const img of Array.from(document.querySelectorAll(".store-icons img[title], img.littleStoreIcons[title]"))) {
    const title = clean(img.getAttribute("title"));
    if (!title) continue;

    const match = allowed.find((item) => item.match.test(title));
    if (!match) continue;

    if (!seen.has(match.name)) {
      seen.add(match.name);
      stores.push({
        name: match.name,
        url: null,
        status: title
      });
    }
  }

  for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
    const href = anchor.href || "";
    const match = allowed.find((item) => item.match.test(href));

    if (!match) continue;

    const key = `${match.name}:${href}`;
    if (seen.has(key)) continue;

    seen.add(key);
    stores.push({
      name: match.name,
      url: href,
      status: "link"
    });
  }

  return stores;
}

function scrapeArtworkUrl() {
  const ogImage = metaContent("property", "og:image");
  if (ogImage) return absolutizeUrl(ogImage);

  const albumImage = document.querySelector(".album-image")?.getAttribute("src");
  if (albumImage) return absolutizeUrl(albumImage);

  const images = Array.from(document.querySelectorAll("img[src]"))
    .map((img) => ({
      src: img.getAttribute("src"),
      width: img.naturalWidth || img.width || 0,
      height: img.naturalHeight || img.height || 0,
      alt: clean(img.getAttribute("alt")) || ""
    }))
    .filter((img) => img.src)
    .sort((a, b) => (b.width * b.height) - (a.width * a.height));

  return images.length ? absolutizeUrl(images[0].src) : null;
}

function parseArtistFromOgDescription() {
  const description = metaContent("property", "og:description");
  if (!description) return null;

  const match = description.match(/\bby\s+(.+?)\.\s+Released/i);
  return match?.[1] || null;
}

function normalizeDateFromOgDescription() {
  const description = metaContent("property", "og:description");
  if (!description) return null;

  const match = description.match(/Released\s+(.+?)\s+\(/i);
  return normalizeDate(match?.[1]);
}

function metaContent(attr, value) {
  return clean(document.querySelector(`meta[${attr}="${value}"]`)?.getAttribute("content"));
}

function textOf(selector) {
  return clean(document.querySelector(selector)?.textContent);
}

function textOfFrom(root, selector) {
  return clean(root.querySelector(selector)?.textContent);
}

function extractAlbumUuid(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("albumuuid") || parsed.searchParams.get("id");
  } catch (_error) {
    return null;
  }
}

function findIsrc(value) {
  const match = String(value || "").match(/\b([A-Z]{2}[A-Z0-9]{3}\d{7})\b/);
  return match?.[1] || null;
}

function inferExplicit(value) {
  if (/\bexplicit\b/i.test(String(value || ""))) return true;
  if (/\bclean\b/i.test(String(value || ""))) return false;
  return null;
}

function normalizeInteger(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);

  const match = String(value || "").match(/\d+/);
  if (!match) return null;

  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

function absolutizeUrl(value) {
  if (!value) return null;

  try {
    return new URL(value, window.location.href).toString();
  } catch (_error) {
    return value;
  }
}

function getDocumentText() {
  return (document.body?.innerText || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clean(value) {
  if (value === null || value === undefined) return null;

  const text = String(value).replace(/\s+/g, " ").trim();
  return text || null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
