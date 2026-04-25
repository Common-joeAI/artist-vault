import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import styles from "../radio.module.css";

export const metadata = {
  title: "Radio Dashboard — Artist Vault",
};

export default async function RadioDashboardPage() {
  const session = await requireSession();

  if (session.role !== "radio_station" && session.role !== "admin") {
    redirect("/vault");
  }

  const station = await db.radioStation.findUnique({
    where: { userId: session.userId },
  });

  if (!station) {
    redirect("/radio/signup/profile");
  }

  // Get release-ready releases, filtered by station's genre preferences
  const stationGenres = station.genrePreferences
    ? station.genrePreferences.toLowerCase().split(",").map((g) => g.trim())
    : [];

  const readyReleases = await db.release.findMany({
    where: { isReleaseReady: true },
    include: {
      artist: { select: { name: true, genres: true, photoUrl: true, links: true } },
      tracks: {
        select: {
          title: true,
          isrc: true,
          durationSeconds: true,
          explicit: true,
          masterFileUrl: true,
        },
        orderBy: { trackNumber: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // Filter by genre match if station has preferences
  const filteredReleases = stationGenres.length > 0
    ? readyReleases.filter((release) => {
        const artistGenres = (release.artist.genres ?? "")
          .toLowerCase()
          .split(",")
          .map((g) => g.trim());
        return stationGenres.some((g) => artistGenres.includes(g));
      })
    : readyReleases;

  // Recent notifications for this station
  const notifications = await db.radioNotification.findMany({
    where: { radioStationId: station.id },
    include: {
      release: {
        select: {
          title: true,
          coverArtUrl: true,
          artist: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>📻 Artist Vault</div>
        <p className={styles.copy}>Radio Station Portal</p>

        <nav className={styles.nav}>
          <Link href="/radio/dashboard">🎵 New Releases</Link>
          <Link href="/radio/notifications">🔔 Notifications</Link>
          <Link href="/radio/settings">⚙️ Station Settings</Link>
        </nav>

        <div className={styles.stationCard}>
          <strong>{station.stationName}</strong>
          {station.city && station.state && (
            <div className={styles.copy}>{station.city}, {station.state}</div>
          )}
          {station.genrePreferences && (
            <div className={styles.genres}>
              {station.genrePreferences.split(",").map((g) => (
                <span key={g} className={styles.genreTag}>{g.trim()}</span>
              ))}
            </div>
          )}
          <div className={styles.notifyBadge}>
            {station.notifyOnRelease ? "🟢 Notifications on" : "⚫ Notifications off"}
          </div>
        </div>

        <form action="/radio/signout" method="POST" style={{ marginTop: "auto" }}>
          <button className={styles.signout} type="submit">Sign out</button>
        </form>
      </aside>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.heading}>Release-Ready Music</h1>
            <p className={styles.subheading}>
              {filteredReleases.length} release{filteredReleases.length !== 1 ? "s" : ""} ready for airplay
              {stationGenres.length > 0 ? " matching your format" : ""}
            </p>
          </div>
          <Link href="/radio/settings" className={styles.settingsBtn}>
            ⚙️ Edit preferences
          </Link>
        </div>

        {filteredReleases.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎵</div>
            <h2>No matching releases yet</h2>
            <p>
              {stationGenres.length > 0
                ? `We'll notify you when release-ready music matches your format (${station.genrePreferences}).`
                : "No release-ready music has been uploaded yet. Check back soon!"}
            </p>
            <Link href="/radio/settings" className={styles.editBtn}>
              Update genre preferences
            </Link>
          </div>
        ) : (
          <div className={styles.releaseGrid}>
            {filteredReleases.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        )}

        {/* Recent notifications */}
        {notifications.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent Notifications</h2>
            <div className={styles.notifList}>
              {notifications.map((n) => (
                <div key={n.id} className={styles.notifRow}>
                  {n.release.coverArtUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.release.coverArtUrl}
                      alt={n.release.title}
                      className={styles.notifThumb}
                    />
                  )}
                  <div>
                    <strong>{n.release.title}</strong>
                    <div className={styles.copy}>by {n.release.artist.name}</div>
                  </div>
                  <span className={`${styles.notifStatus} ${styles[`status_${n.status}`]}`}>
                    {n.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Release Card Component ───────────────────────────────────────────────────

type ReleaseWithDetails = {
  id: string;
  title: string;
  releaseType: string;
  coverArtUrl: string | null;
  releaseDate: Date | null;
  distributor: string | null;
  artist: {
    name: string;
    genres: string | null;
    photoUrl: string | null;
    links: Array<{ platform: string; url: string }>;
  };
  tracks: Array<{
    title: string;
    isrc: string | null;
    durationSeconds: number | null;
    explicit: boolean;
    masterFileUrl: string | null;
  }>;
};

function ReleaseCard({ release }: { release: ReleaseWithDetails }) {
  const totalDuration = release.tracks.reduce(
    (sum, t) => sum + (t.durationSeconds ?? 0),
    0
  );
  const durMin = Math.floor(totalDuration / 60);
  const durSec = String(totalDuration % 60).padStart(2, "0");

  return (
    <div className={styles.releaseCard}>
      <div className={styles.releaseTop}>
        {release.coverArtUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={release.coverArtUrl}
            alt={release.title}
            className={styles.coverArt}
          />
        ) : (
          <div className={styles.coverPlaceholder}>🎵</div>
        )}
        <div className={styles.releaseInfo}>
          <div className={styles.releaseType}>{release.releaseType}</div>
          <h3 className={styles.releaseTitle}>{release.title}</h3>
          <div className={styles.artistName}>by {release.artist.name}</div>
          {release.releaseDate && (
            <div className={styles.copy}>
              {new Date(release.releaseDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}
          {release.artist.genres && (
            <div className={styles.genres}>
              {release.artist.genres.split(",").slice(0, 3).map((g) => (
                <span key={g} className={styles.genreTag}>{g.trim()}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.readyBadge}>
        ✅ Release Ready · {release.tracks.length} track{release.tracks.length !== 1 ? "s" : ""}
        {totalDuration > 0 && ` · ${durMin}:${durSec}`}
      </div>

      <div className={styles.trackList}>
        {release.tracks.map((track, idx) => (
          <div key={idx} className={styles.trackRow}>
            <span className={styles.trackNum}>{idx + 1}</span>
            <span className={styles.trackTitle}>
              {track.title}
              {track.explicit && <span className={styles.explicitBadge}>E</span>}
            </span>
            {track.isrc && (
              <span className={styles.isrc}>{track.isrc}</span>
            )}
            {track.durationSeconds && (
              <span className={styles.duration}>
                {Math.floor(track.durationSeconds / 60)}:
                {String(track.durationSeconds % 60).padStart(2, "0")}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className={styles.releaseActions}>
        <Link
          href={`/presskit/${release.id}`}
          className={styles.btnPrimary}
          target="_blank"
        >
          📄 View Press Kit
        </Link>
        {release.distributor && (
          <span className={styles.distributor}>via {release.distributor}</span>
        )}
      </div>
    </div>
  );
}
