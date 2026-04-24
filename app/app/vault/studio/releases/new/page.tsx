import { redirect } from "next/navigation";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { createReleaseAction } from "@/app/vault/catalog-actions";
import { EditorShortcuts } from "@/components/vault/editor-shortcuts";
import styles from "@/app/vault/ui.module.css";

export default async function StudioNewReleasePage() {
  const profile = await getPrimaryArtistProfile();

  if (!profile) {
    redirect("/vault/onboarding");
  }

  return (
    <div className={styles.grid}>
      <EditorShortcuts
        title="Release editor"
        description="Create the release here, then use uploaded cover art URLs, imported DSP links, and press assets without bouncing around the app."
        mediaHint="Upload cover art in the media library under covers or press, then paste the returned URL into the cover art field below."
      />

      <section className={styles.card}>
        <div className={styles.eyebrow}>Studio release editor</div>
        <h2 className={styles.title}>Add a single, EP, or album</h2>
        <form action={createReleaseAction} className={styles.form}>
          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="title">Release title</label>
              <input id="title" name="title" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="releaseType">Release type</label>
              <select id="releaseType" name="releaseType" defaultValue="SINGLE">
                <option value="SINGLE">Single</option>
                <option value="EP">EP</option>
                <option value="ALBUM">Album</option>
              </select>
            </div>
          </div>

          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="distributor">Distributor</label>
              <input id="distributor" name="distributor" placeholder="DistroKid" />
            </div>
            <div className={styles.field}>
              <label htmlFor="releaseDate">Release date</label>
              <input id="releaseDate" name="releaseDate" type="date" />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="coverArtUrl">Cover art URL</label>
            <input id="coverArtUrl" name="coverArtUrl" placeholder="Paste a URL from /vault/media or a hosted asset" />
          </div>

          <div className={styles.columns3}>
            <div className={styles.field}>
              <label htmlFor="spotifyUrl">Spotify URL</label>
              <input id="spotifyUrl" name="spotifyUrl" placeholder="https://..." />
            </div>
            <div className={styles.field}>
              <label htmlFor="appleMusicUrl">Apple Music URL</label>
              <input id="appleMusicUrl" name="appleMusicUrl" placeholder="https://..." />
            </div>
            <div className={styles.field}>
              <label htmlFor="youtubeMusicUrl">YouTube Music URL</label>
              <input id="youtubeMusicUrl" name="youtubeMusicUrl" placeholder="https://..." />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" placeholder="Campaign notes, release strategy, collaborators, promo reminders, or admin context." />
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit">
              Save release
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
