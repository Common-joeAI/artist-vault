import { db } from "@/lib/db";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function proLabel(status: string) {
  if (status === "REGISTERED") return { text: "PRO ✓", color: "#34d399" };
  if (status === "PENDING") return { text: "PRO pending", color: "#fbbf24" };
  return null;
}

export default async function PressKitExportPage() {
  const profile = await getPrimaryArtistProfile();
  const pressKit = profile?.pressKits?.[0] ?? null;
  const links = profile?.links ?? [];

  let featuredIds: string[] = [];
  try { featuredIds = JSON.parse(pressKit?.featuredTrackIds ?? "[]"); } catch {}

  const allReleases = profile?.releases ?? [];
  const selectedReleases = featuredIds.length
    ? allReleases.filter((r) => featuredIds.includes(r.id))
    : allReleases.slice(0, 8);

  // Load full release data with tracks
  const releasesWithTracks = await Promise.all(
    selectedReleases.map((r) =>
      db.release.findUnique({
        where: { id: r.id },
        include: { tracks: { orderBy: { trackNumber: "asc" } } },
      })
    )
  );

  const card = { border: "1px solid rgba(255,255,255,0.08)", borderRadius: "28px", padding: "1.5rem", background: "rgba(255,255,255,0.03)" };
  const sectionTitle = { marginTop: 0, marginBottom: "1rem", fontSize: "1.25rem", fontWeight: 700 };

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a10", color: "#f4f7fb", padding: "2rem" }}>
      <div style={{ width: "min(960px, 100%)", margin: "0 auto", display: "grid", gap: "1.5rem" }}>

        {/* Hero */}
        <section style={{ ...card, display: "grid", gridTemplateColumns: pressKit?.heroImageUrl ? "1fr auto" : "1fr", gap: "1.5rem", alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", borderRadius: 999, padding: "0.35rem 0.7rem", background: "rgba(124,58,237,0.16)", color: "#ddd6fe", marginBottom: "1rem", fontSize: "0.8rem" }}>
              AI Artist Vault Press Kit
            </div>
            <h1 style={{ fontSize: "3rem", margin: "0 0 0.5rem" }}>{profile?.name ?? "Artist"}</h1>
            {profile?.location && <div style={{ color: "#7c3aed", marginBottom: "0.5rem" }}>{profile.location}</div>}
            <p style={{ color: "#aab3c2", lineHeight: 1.8, margin: 0 }}>{pressKit?.shortBio ?? profile?.bio ?? "No short bio saved yet."}</p>
          </div>
          {pressKit?.heroImageUrl && (
            <img src={pressKit.heroImageUrl} alt={`${profile?.name} press photo`} style={{ width: 160, height: 160, borderRadius: 16, objectFit: "cover" }} />
          )}
        </section>

        {/* About + Contact */}
        <section style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem" }}>
          <div style={card}>
            <h2 style={sectionTitle}>About</h2>
            <p style={{ color: "#d5d9e3", lineHeight: 1.85, margin: 0 }}>{pressKit?.longBio ?? profile?.bio ?? "No long bio saved yet."}</p>
          </div>
          <div style={card}>
            <h2 style={sectionTitle}>Contact</h2>
            {pressKit?.contactEmail && <p style={{ color: "#d5d9e3", margin: "0 0 0.75rem" }}>{pressKit.contactEmail}</p>}
            {pressKit?.websiteUrl && (
              <p style={{ margin: "0 0 0.75rem" }}>
                <a href={pressKit.websiteUrl} style={{ color: "#a78bfa" }}>{pressKit.websiteUrl}</a>
              </p>
            )}
            {links.length > 0 && (
              <ul style={{ paddingLeft: "1.2rem", color: "#d5d9e3", margin: 0 }}>
                {links.map((link) => (
                  <li key={link.id} style={{ marginBottom: "0.3rem" }}>
                    <a href={link.url} style={{ color: "#a78bfa" }}>{link.label ?? link.platform}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Releases */}
        {releasesWithTracks.length > 0 && (
          <section style={card}>
            <h2 style={sectionTitle}>Releases</h2>
            <div style={{ display: "grid", gap: "1.25rem" }}>
              {releasesWithTracks.map((release) => {
                if (!release) return null;
                return (
                  <div key={release.id} style={{ paddingBottom: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "1.05rem" }}>{release.title}</strong>
                      <span style={{ color: "#7c3aed", fontSize: "0.8rem", fontWeight: 600 }}>{release.releaseType}</span>
                      {release.releaseDate && <span style={{ color: "#aab3c2", fontSize: "0.8rem" }}>{new Date(release.releaseDate).getFullYear()}</span>}
                      {release.isReleaseReady && <span style={{ color: "#34d399", fontSize: "0.8rem", fontWeight: 600 }}>✓ Release Ready</span>}
                    </div>
                    {/* Streaming links */}
                    <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      {release.spotifyUrl && <a href={release.spotifyUrl} style={{ color: "#1DB954", fontSize: "0.8rem" }}>Spotify</a>}
                      {release.appleMusicUrl && <a href={release.appleMusicUrl} style={{ color: "#FC3C44", fontSize: "0.8rem" }}>Apple Music</a>}
                      {release.youtubeMusicUrl && <a href={release.youtubeMusicUrl} style={{ color: "#FF0000", fontSize: "0.8rem" }}>YouTube Music</a>}
                    </div>
                    {/* Track listing */}
                    {release.tracks.length > 0 && (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", color: "#d5d9e3" }}>
                        <thead>
                          <tr style={{ color: "#aab3c2", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                            <th style={{ textAlign: "left", padding: "0.3rem 0.5rem 0.3rem 0" }}>#</th>
                            <th style={{ textAlign: "left", padding: "0.3rem 0.5rem" }}>Title</th>
                            <th style={{ textAlign: "left", padding: "0.3rem 0.5rem" }}>ISRC</th>
                            <th style={{ textAlign: "left", padding: "0.3rem 0.5rem" }}>BPM</th>
                            <th style={{ textAlign: "left", padding: "0.3rem 0.5rem" }}>Duration</th>
                            <th style={{ textAlign: "left", padding: "0.3rem 0.5rem" }}>PRO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {release.tracks.map((track) => {
                            const pro = proLabel(track.proStatus);
                            return (
                              <tr key={track.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: "0.4rem 0.5rem 0.4rem 0", color: "#aab3c2" }}>{track.trackNumber ?? " - "}</td>
                                <td style={{ padding: "0.4rem 0.5rem" }}>{track.title}</td>
                                <td style={{ padding: "0.4rem 0.5rem", fontFamily: "monospace", color: "#aab3c2" }}>{track.isrc ?? " - "}</td>
                                <td style={{ padding: "0.4rem 0.5rem", color: "#aab3c2" }}>{track.bpm ?? " - "}</td>
                                <td style={{ padding: "0.4rem 0.5rem", color: "#aab3c2" }}>{formatDuration(track.durationSeconds) ?? " - "}</td>
                                <td style={{ padding: "0.4rem 0.5rem" }}>
                                  {pro ? <span style={{ color: pro.color, fontWeight: 600, fontSize: "0.75rem" }}>{pro.text}</span> : <span style={{ color: "#555" }}> - </span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer style={{ textAlign: "center", color: "#555", fontSize: "0.8rem", padding: "1rem 0" }}>
          Generated by <a href="https://aiartistvault.com" style={{ color: "#7c3aed" }}>AI Artist Vault</a>
        </footer>
      </div>
    </main>
  );
}
