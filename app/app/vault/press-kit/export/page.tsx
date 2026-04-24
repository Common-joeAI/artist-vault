import { getPrimaryArtistProfile } from "@/lib/artist-vault";

export default async function PressKitExportPage() {
  const profile = await getPrimaryArtistProfile();
  const pressKit = profile?.pressKits?.[0] ?? null;
  const links = profile?.links ?? [];
  const releases = profile?.releases?.slice(0, 8) ?? [];

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a10", color: "#f4f7fb", padding: "2rem" }}>
      <div style={{ width: "min(960px, 100%)", margin: "0 auto", display: "grid", gap: "1.5rem" }}>
        <section style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "28px", padding: "2rem", background: "rgba(255,255,255,0.03)" }}>
          <div style={{ display: "inline-flex", borderRadius: 999, padding: "0.35rem 0.7rem", background: "rgba(124,58,237,0.16)", color: "#ddd6fe", marginBottom: "1rem" }}>
            Artist Vault Press Kit
          </div>
          <h1 style={{ fontSize: "3rem", margin: 0 }}>{profile?.name ?? "Artist"}</h1>
          <p style={{ color: "#aab3c2", lineHeight: 1.8 }}>{pressKit?.shortBio ?? profile?.bio ?? "No short bio saved yet."}</p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1rem" }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "28px", padding: "1.5rem", background: "rgba(255,255,255,0.03)" }}>
            <h2 style={{ marginTop: 0 }}>About</h2>
            <p style={{ color: "#d5d9e3", lineHeight: 1.85 }}>{pressKit?.longBio ?? profile?.bio ?? "No long bio saved yet."}</p>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "28px", padding: "1.5rem", background: "rgba(255,255,255,0.03)" }}>
            <h2 style={{ marginTop: 0 }}>Contact</h2>
            <p style={{ color: "#d5d9e3" }}>{pressKit?.contactEmail ?? "No contact email saved."}</p>
            <h3>Website</h3>
            <p style={{ color: "#d5d9e3" }}>{pressKit?.websiteUrl ?? "No website URL saved."}</p>
            <h3>Links</h3>
            <ul style={{ paddingLeft: "1.2rem", color: "#d5d9e3" }}>
              {links.length ? links.map((link) => <li key={link.id}>{link.label ?? link.platform}: {link.url}</li>) : <li>No artist links saved.</li>}
            </ul>
          </div>
        </section>

        <section style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "28px", padding: "1.5rem", background: "rgba(255,255,255,0.03)" }}>
          <h2 style={{ marginTop: 0 }}>Selected releases</h2>
          <div style={{ display: "grid", gap: "0.9rem" }}>
            {releases.length ? (
              releases.map((release) => (
                <div key={release.id} style={{ paddingBottom: "0.9rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <strong>{release.title}</strong>
                  <div style={{ color: "#aab3c2" }}>{release.releaseType}</div>
                  <div style={{ color: "#d5d9e3" }}>{release.notes ?? "No release notes saved."}</div>
                </div>
              ))
            ) : (
              <div style={{ color: "#aab3c2" }}>No releases saved yet.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
