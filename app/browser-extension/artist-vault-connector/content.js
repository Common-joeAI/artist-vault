function readVaultImportContext() {
  const tokenInput =
    document.querySelector("#distrokid-import-token") ||
    document.querySelector('textarea[id*="token"]') ||
    document.querySelector('input[id*="token"]');

  const originInput =
    document.querySelector('input[value^="https://www.aiartistvault.com"]') ||
    document.querySelector('input[value^="https://aiartistvault.com"]');

  const token =
    tokenInput && "value" in tokenInput
      ? String(tokenInput.value || "").trim()
      : "";

  const vaultOrigin =
    originInput && "value" in originInput && String(originInput.value || "").trim()
      ? String(originInput.value || "").trim()
      : window.location.origin;

  return {
    ok: true,
    token,
    vaultOrigin,
    pageUrl: window.location.href,
    pageTitle: document.title,
  };
}

function discoverReleaseLinks() {
  const links = Array.from(
    document.querySelectorAll('a[href*="album/?albumuuid="], a[href*="/dashboard/album/?albumuuid="]')
  )
    .map((a) => a.href)
    .filter(Boolean);

  return [...new Set(links)];
}

function scrapeReleasePage() {
  const pageText = document.body?.innerText || "";

  const headingCandidates = Array.from(document.querySelectorAll("h1, h2, h3"))
    .map((el) => (el.textContent || "").trim())
    .filter(Boolean)
    .filter((t) => !/^help$/i.test(t))
    .filter((t) => !/^(stores?|lyrics?|edit|view|support)$/i.test(t))
    .sort((a, b) => b.length - a.length);

  let title = headingCandidates[0] || "Untitled Release";

  const artistCandidate = Array.from(document.querySelectorAll("h1 + div, h2 + div, h3 + div"))
    .map((el) => (el.textContent || "").trim())
    .find(Boolean);

  const artist = artistCandidate || null;

  const upcMatch = pageText.match(/UPC:\s*(\d{8,})/i);
  const upc = upcMatch ? upcMatch[1] : null;

  const releaseDateMatch = pageText.match(/Release date:\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
  const releaseDate = releaseDateMatch ? releaseDateMatch[1] : null;

  const labelMatch = pageText.match(/Label:\s*([^\n]+)/i);
  const labelName = labelMatch ? labelMatch[1].trim() : null;

  const storeLinks = Array.from(document.querySelectorAll("a[href]"))
    .map((a) => ({
      name: ((a.textContent || "").trim() || new URL(a.href, window.location.href).hostname),
      url: a.href,
    }))
    .filter((s) => /^https?:/i.test(s.url))
    .filter((s) => /spotify|apple|itunes|youtube/i.test((s.name || "") + " " + s.url));

  if (!title || /^help$/i.test(title)) {
    const fallbackUrl =
      (storeLinks.find((s) => /apple|itunes/i.test((s.name || "") + " " + s.url)) || {}).url ||
      (storeLinks.find((s) => /spotify/i.test((s.name || "") + " " + s.url)) || {}).url ||
      "";

    const slugMatch = fallbackUrl.match(/album\/([^/?]+)/i);
    if (slugMatch && slugMatch[1]) {
      title = slugMatch[1]
        .replace(/-single$/i, "")
        .replace(/-ep$/i, "")
        .replace(/-\d+$/i, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    }
  }

  const tracks = [];
  const seenIsrc = new Set();

  Array.from(document.querySelectorAll("tr")).forEach((row) => {
    const fullText = row.innerText || "";
    const isrcMatch = fullText.match(/[A-Z]{2}[A-Z0-9]{3}\d{7}/);

    if (!isrcMatch) return;

    const isrc = isrcMatch[0];
    if (seenIsrc.has(isrc)) return;
    seenIsrc.add(isrc);

    const cells = Array.from(row.querySelectorAll("td"));
    const candidateTexts = cells
      .map((c) => (c.innerText || "").trim())
      .filter(Boolean)
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter((t) => !/[A-Z]{2}[A-Z0-9]{3}\d{7}/.test(t))
      .filter((t) => !/lyrics|edit|view|help|spotify|apple|youtube|credits|hyperfollow/i.test(t))
      .filter((t) => t.length > 2);

    let trackTitle = candidateTexts[0] || null;

    if (!trackTitle) {
      const lines = fullText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .filter((t) => !/[A-Z]{2}[A-Z0-9]{3}\d{7}/.test(t))
        .filter((t) => !/lyrics|edit|view|help|spotify|apple|youtube|credits|hyperfollow/i.test(t))
        .filter((t) => t.length > 2);

      trackTitle = lines[0] || null;
    }

    tracks.push({
      source_track_id: isrc,
      track_number: tracks.length + 1,
      title: trackTitle || ("Track " + (tracks.length + 1)),
      isrc,
      duration_text: null,
      explicit: null,
    });
  });

  const artwork =
    document.querySelector('img[src*="cloudfront"], img[src*="distrokid"], img')?.src || null;

  return {
    source_release_id: new URL(window.location.href).searchParams.get("albumuuid") || window.location.href,
    title: title || "Untitled Release",
    artist_name: artist,
    release_date: releaseDate,
    upc,
    label_name: labelName,
    artwork_url: artwork,
    source_url: window.location.href,
    stores: storeLinks,
    tracks,
    raw: {},
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "AV_GET_VAULT_IMPORT_CONTEXT") {
    try {
      sendResponse(readVaultImportContext());
    } catch (error) {
      sendResponse({
        ok: false,
        message: error instanceof Error ? error.message : "Unable to read Artist Vault page.",
      });
    }
    return true;
  }

  if (message?.type === "AV_DISCOVER_RELEASES") {
    try {
      sendResponse({ releaseLinks: discoverReleaseLinks() });
    } catch (error) {
      sendResponse({
        ok: false,
        message: error instanceof Error ? error.message : "Unable to discover DistroKid releases.",
      });
    }
    return true;
  }

  if (message?.type === "AV_SCRAPE_RELEASE_PAGE") {
    try {
      sendResponse(scrapeReleasePage());
    } catch (error) {
      sendResponse({
        ok: false,
        message: error instanceof Error ? error.message : "Unable to scrape DistroKid release page.",
      });
    }
    return true;
  }

  return undefined;
});
