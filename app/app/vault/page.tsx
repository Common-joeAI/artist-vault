import Link from "next/link";
import { getPrimaryArtistProfile, formatDisplayDate } from "@/lib/artist-vault";
import styles from "@/app/vault/ui.module.css";

export default async function VaultDashboardPage() {
  const profile = await getPrimaryArtistProfile();
  const releases = profile?.releases ?? [];
  const trackCount = releases.reduce((count, release) => count + release.tracks.length, 0);
  const registrationReadyCount = releases.reduce(
    (count, release) =>
      count +
      release.tracks.filter((track) => track.ascapStatus === "APPROVED" || track.bmiStatus === "APPROVED").length,
    0,
  );

  return (
    <div className={styles.grid}>
      <section className={styles.stats}>
        <div className={styles.card}>
          <div className={styles.label}>Artist profile</div>
          <div className={styles.value}>{profile ? "Ready" : "Pending"}</div>
          <div className={styles.meta}>{profile ? profile.name : "Run onboarding to create the primary artist record."}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Releases</div>
          <div className={styles.value}>{releases.length}</div>
          <div className={styles.meta}>Singles, EPs, and albums stored in the vault.</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Tracks</div>
          <div className={styles.value}>{trackCount}</div>
          <div className={styles.meta}>Song-level records with ISRCs, lyrics, and split notes.</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Registration complete</div>
          <div className={styles.value}>{registrationReadyCount}</div>
          <div className={styles.meta}>Tracks with at least one approved ASCAP or BMI status.</div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.eyebrow}>Quick actions</div>
        <h2 className={styles.title}>Start where you are</h2>
        <div className={styles.actions}>
          <Link className={styles.button} href="/vault/onboarding">
            {profile ? "Edit artist profile" : "Run onboarding"}
          </Link>
          <Link className={styles.buttonSecondary} href="/vault/releases">
            Open releases
          </Link>
          <Link className={styles.buttonSecondary} href="/vault/releases/new">
            Add release
          </Link>
          <Link className={styles.buttonSecondary} href="/vault/media">
            Open media library
          </Link>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.eyebrow}>Artist snapshot</div>
        <h2 className={styles.title}>{profile?.name ?? "No artist profile yet"}</h2>
        {profile ? (
          <div className={styles.list}>
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.name}
                style={{ width: "100%", maxWidth: "240px", borderRadius: "18px", objectFit: "cover" }}
              />
            ) : null}
            <div className={styles.meta}>{profile.bio || "No bio saved yet."}</div>
            <div className={styles.meta}>Created {formatDisplayDate(profile.createdAt)} · Updated {formatDisplayDate(profile.updatedAt)}</div>
            <div className={styles.meta}>Links saved: {profile.links.length}</div>
          </div>
        ) : (
          <p className={styles.empty}>
            The vault is authenticated, but it does not have a canonical artist profile yet. Complete onboarding to set your name,
            bio, photo URL, and platform links before you build out the catalog.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.eyebrow}>Recent releases</div>
        <h2 className={styles.title}>Catalog overview</h2>
        {releases.length ? (
          <div className={styles.list}>
            {releases.slice(0, 5).map((release) => (
              <div className={styles.listItem} key={release.id} style={{ alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                  {release.coverArtUrl ? (
                    <img
                      src={release.coverArtUrl}
                      alt={release.title}
                      style={{ width: "72px", height: "72px", borderRadius: "14px", objectFit: "cover" }}
                    />
                  ) : null}
                  <div>
                    <div><strong>{release.title}</strong></div>
                    <div className={styles.meta}>
                      {release.releaseType} · {formatDisplayDate(release.releaseDate)} · {release.tracks.length} track(s)
                    </div>
                  </div>
                </div>
                <Link className={styles.inlineLink} href={`/vault/releases/${release.id}`}>
                  View release
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No releases yet. Add your first single, EP, or album to start building the vault.</p>
        )}
      </section>
    </div>
  );
}
