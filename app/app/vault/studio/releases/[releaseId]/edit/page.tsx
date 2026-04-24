import { notFound } from "next/navigation";
import { getReleaseById, toDateInputValue } from "@/lib/artist-vault";
import { updateReleaseAction } from "@/app/vault/catalog-actions";
import { EditorShortcuts } from "@/components/vault/editor-shortcuts";
import styles from "@/app/vault/ui.module.css";

export default async function StudioEditReleasePage({ params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await params;
  const release = await getReleaseById(releaseId);

  if (!release) {
    notFound();
  }

  const action = updateReleaseAction.bind(null, release.id);

  return (
    <div className={styles.grid}>
      <EditorShortcuts
        title="Release editor"
        description="Update release metadata here while keeping media uploads, imports, and press work one click away."
        mediaHint="Use the media library for new cover uploads, then paste the resulting URL into the cover art field before saving."
      />

      <section className={styles.card}>
        <div className={styles.eyebrow}>Studio release editor</div>
        <h2 className={styles.title}>{release.title}</h2>
        <form action={action} className={styles.form}>
          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="title">Release title</label>
              <input id="title" name="title" defaultValue={release.title} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="releaseType">Release type</label>
              <select id="releaseType" name="releaseType" defaultValue={release.releaseType}>
                <option value="SINGLE">Single</option>
                <option value="EP">EP</option>
                <option value="ALBUM">Album</option>
              </select>
            </div>
          </div>

          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="distributor">Distributor</label>
              <input id="distributor" name="distributor" defaultValue={release.distributor ?? ""} />
            </div>
            <div className={styles.field}>
              <label htmlFor="releaseDate">Release date</label>
              <input id="releaseDate" name="releaseDate" type="date" defaultValue={toDateInputValue(release.releaseDate)} />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="coverArtUrl">Cover art URL</label>
            <input id="coverArtUrl" name="coverArtUrl" defaultValue={release.coverArtUrl ?? ""} />
          </div>

          <div className={styles.columns3}>
            <div className={styles.field}>
              <label htmlFor="spotifyUrl">Spotify URL</label>
              <input id="spotifyUrl" name="spotifyUrl" defaultValue={release.spotifyUrl ?? ""} />
            </div>
            <div className={styles.field}>
              <label htmlFor="appleMusicUrl">Apple Music URL</label>
              <input id="appleMusicUrl" name="appleMusicUrl" defaultValue={release.appleMusicUrl ?? ""} />
            </div>
            <div className={styles.field}>
              <label htmlFor="youtubeMusicUrl">YouTube Music URL</label>
              <input id="youtubeMusicUrl" name="youtubeMusicUrl" defaultValue={release.youtubeMusicUrl ?? ""} />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" defaultValue={release.notes ?? ""} />
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit">
              Update release
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
