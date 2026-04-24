import { redirect } from "next/navigation";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { createReleaseAction } from "@/app/vault/catalog-actions";
import { AssetUrlPicker } from "@/components/uploads/asset-url-picker";
import { InlineAssetUpload } from "@/components/uploads/inline-asset-upload";
import styles from "@/app/vault/ui.module.css";

export default async function NewReleasePage() {
  const profile = await getPrimaryArtistProfile();

  if (!profile) {
    redirect("/vault/onboarding");
  }

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>New release</div>
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
            <input id="coverArtUrl" name="coverArtUrl" placeholder="https://..." />
          </div>

          <InlineAssetUpload
            inputId="coverArtUrl"
            defaultCategory="covers"
            title="Upload cover art here"
            helpText="Drop in the release artwork during setup and the public URL will populate the field above."
          />

          <AssetUrlPicker inputId="coverArtUrl" defaultCategory="covers" label="Use existing uploaded cover art" />

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
