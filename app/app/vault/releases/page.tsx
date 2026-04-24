import Link from "next/link";
import { getPrimaryArtistProfile, formatDisplayDate } from "@/lib/artist-vault";
import { deleteReleaseAction } from "@/app/vault/catalog-actions";
import styles from "@/app/vault/ui.module.css";

export default async function ReleasesPage() {
  const profile = await getPrimaryArtistProfile();
  const releases = profile?.releases ?? [];

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Catalog</div>
        <h2 className={styles.title}>Releases</h2>
        <p className={styles.help}>
          Store singles, EPs, and albums with release metadata, DSP links, and nested track records for lyrics, ISRCs, and rights-admin.
        </p>
        <div className={styles.actions}>
          <Link className={styles.button} href="/vault/releases/new">
            Add release
          </Link>
          {!profile ? (
            <Link className={styles.buttonSecondary} href="/vault/onboarding">
              Run onboarding first
            </Link>
          ) : null}
        </div>
      </section>

      <section className={styles.card}>
        {releases.length ? (
          <div className={styles.list}>
            {releases.map((release) => (
              <div className={styles.listItem} key={release.id}>
                <div>
                  <div><strong>{release.title}</strong></div>
                  <div className={styles.meta}>
                    {release.releaseType} · {formatDisplayDate(release.releaseDate)} · {release.tracks.length} track(s)
                  </div>
                  <div className={styles.meta}>{release.distributor || "No distributor noted yet."}</div>
                </div>
                <div className={styles.actions}>
                  <Link className={styles.inlineLink} href={`/vault/releases/${release.id}`}>
                    View
                  </Link>
                  <Link className={styles.inlineLink} href={`/vault/releases/${release.id}/edit`}>
                    Edit
                  </Link>
                  <form action={deleteReleaseAction}>
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
          <p className={styles.empty}>No releases stored yet. Create the first release to start building your discography.</p>
        )}
      </section>
    </div>
  );
}
