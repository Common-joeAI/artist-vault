import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTrackAction } from "@/app/vault/catalog-actions";
import { formatDisplayDate, getReleaseById } from "@/lib/artist-vault";
import styles from "@/app/vault/ui.module.css";

function StreamingLinks({ json }: { json: string | null }) {
  if (!json) return null;
  let links: Record<string, string> = {};
  try { links = JSON.parse(json); } catch { return null; }
  const platforms = [
    { key: "spotify",    label: "Spotify",     color: "#1DB954", icon: "♫" },
    { key: "appleMusic", label: "Apple Music", color: "#FC3C44", icon: "♪" },
    { key: "youtube",    label: "YouTube",     color: "#FF0000", icon: "▶" },
    { key: "deezer",     label: "Deezer",      color: "#A238FF", icon: "◈" },
  ];
  const found = platforms.filter(p => links[p.key]);
  if (!found.length) return null;
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
      {found.map(p => (
        <a
          key={p.key}
          href={links[p.key]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "2px 10px", borderRadius: "999px", fontSize: "0.72rem",
            fontWeight: 600, textDecoration: "none", color: "#fff",
            background: p.color, opacity: 0.92,
          }}
        >
          <span>{p.icon}</span> {p.label}
        </a>
      ))}
    </div>
  );
}

export default async function ReleaseDetailPage({ params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await params;
  const release = await getReleaseById(releaseId);

  if (!release) {
    notFound();
  }

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Release</div>
        <h2 className={styles.title}>{release.title}</h2>

        {release.coverArtUrl ? (
          <img
            src={release.coverArtUrl}
            alt={release.title}
            style={{ width: "100%", maxWidth: "320px", borderRadius: "20px", marginTop: "0.5rem" }}
          />
        ) : null}

        <div className={styles.meta}>
          {release.releaseType} · {formatDisplayDate(release.releaseDate)} · {release.distributor || "No distributor noted"}
        </div>

        <div className={styles.actions} style={{ marginTop: "1rem" }}>
          <Link className={styles.button} href={`/vault/releases/${release.id}/edit`}>
            Edit release
          </Link>
          <Link className={styles.buttonSecondary} href={`/vault/releases/${release.id}/tracks/new`}>
            Add track
          </Link>
        </div>

        {release.notes ? <p className={styles.help}>{release.notes}</p> : null}
      </section>

      <section className={styles.card}>
        <div className={styles.eyebrow}>Tracks</div>
        <h2 className={styles.title}>Track listing</h2>
        {release.tracks.length ? (
          <div className={styles.list}>
            {release.tracks.map((track) => (
              <div className={styles.listItem} key={track.id} style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div>
                    <strong>
                      {track.trackNumber ? `${track.trackNumber}. ` : ""}
                      {track.title}
                    </strong>
                  </div>

                  <div className={styles.meta}>
                    ISRC: {track.isrc || " - "} · ASCAP: {track.ascapStatus} · BMI: {track.bmiStatus}
                  </div>

                  {track.audioPreviewUrl ? (
                    <audio controls preload="none" src={track.audioPreviewUrl} style={{ marginTop: "0.4rem" }} />
                  ) : null}

                  <StreamingLinks json={(track as any).streamingLinksJson ?? null} />

                  <div className={styles.meta} style={{ marginTop: "4px" }}>{track.writers || "No writers listed yet."}</div>
                </div>

                <div className={styles.actions}>
                  <Link className={styles.inlineLink} href={`/vault/releases/${release.id}/tracks/${track.id}/edit`}>
                    Edit
                  </Link>
                  <form action={deleteTrackAction}>
                    <input type="hidden" name="trackId" value={track.id} />
                    <input type="hidden" name="releaseId" value={release.id} />
                    <button className={styles.buttonDanger} type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No tracks added yet. Add the first track to capture lyrics, ISRCs, and registration status.</p>
        )}
      </section>
    </div>
  );
}
