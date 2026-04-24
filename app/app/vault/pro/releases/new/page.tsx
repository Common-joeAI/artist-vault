import { redirect } from "next/navigation";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { createReleaseAction } from "@/app/vault/catalog-actions";
import { AssetUrlPicker } from "@/components/uploads/asset-url-picker";
import { EditorShortcuts } from "@/components/vault/editor-shortcuts";
import styles from "@/app/vault/ui.module.css";

export default async function ProNewReleasePage() {
  const profile = await getPrimaryArtistProfile();

  if (!profile) {
    redirect("/vault/onboarding");
  }

  return (
    <div className={styles.grid}>
      <EditorShortcuts
        title="Release editor"
        description="Create release records with direct access to uploaded cover art and the rest of the workflow tools."
        mediaHint="Pick a previously uploaded cover asset directly into the field below or open the media library for new uploads."
      />

      <section className={styles.card}>
        <div className={styles.eyebrow}>Pro release editor</div>
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
            <input id="coverArtUrl" name="coverArtUrl" placeholder="Choose uploaded cover art or paste a hosted URL" />
          </div>
          <AssetUrlPicker inputId="coverArtUrl" defaultCategory="covers" label="Choose from uploaded cover assets" />

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
            <button className={styles.button} type="submit">Save release</button>
          </div>
        </form>
      </section>
    </div>
  );
}
