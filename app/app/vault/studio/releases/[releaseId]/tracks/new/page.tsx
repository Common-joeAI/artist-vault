import { notFound } from "next/navigation";
import { getReleaseById } from "@/lib/artist-vault";
import { createTrackAction } from "@/app/vault/catalog-actions";
import { EditorShortcuts } from "@/components/vault/editor-shortcuts";
import styles from "@/app/vault/ui.module.css";

const registrationStatuses = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "APPROVED"] as const;

export default async function StudioNewTrackPage({ params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await params;
  const release = await getReleaseById(releaseId);

  if (!release) {
    notFound();
  }

  const action = createTrackAction.bind(null, release.id);

  return (
    <div className={styles.grid}>
      <EditorShortcuts
        title="Track editor"
        description="Create a track with quick access to master uploads, preview assets, rights review, and press-kit context."
        mediaHint="Upload full audio to masters and lighter listening assets to previews, then paste those URLs into the fields below."
      />

      <section className={styles.card}>
        <div className={styles.eyebrow}>Studio track editor</div>
        <h2 className={styles.title}>Add track to {release.title}</h2>
        <form action={action} className={styles.form}>
          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="title">Track title</label>
              <input id="title" name="title" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="trackNumber">Track number</label>
              <input id="trackNumber" name="trackNumber" type="number" min="1" />
            </div>
          </div>

          <div className={styles.columns3}>
            <div className={styles.field}>
              <label htmlFor="isrc">ISRC</label>
              <input id="isrc" name="isrc" />
            </div>
            <div className={styles.field}>
              <label htmlFor="durationSeconds">Duration (seconds)</label>
              <input id="durationSeconds" name="durationSeconds" type="number" min="1" />
            </div>
            <div className={styles.field}>
              <label htmlFor="bpm">BPM</label>
              <input id="bpm" name="bpm" type="number" min="1" />
            </div>
          </div>

          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="masterFileUrl">Master file URL</label>
              <input id="masterFileUrl" name="masterFileUrl" placeholder="Paste a URL from /vault/media" />
            </div>
            <div className={styles.field}>
              <label htmlFor="audioPreviewUrl">Preview URL</label>
              <input id="audioPreviewUrl" name="audioPreviewUrl" placeholder="Paste a URL from /vault/media" />
            </div>
          </div>

          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="ascapStatus">ASCAP status</label>
              <select id="ascapStatus" name="ascapStatus" defaultValue="NOT_STARTED">
                {registrationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="bmiStatus">BMI status</label>
              <select id="bmiStatus" name="bmiStatus" defaultValue="NOT_STARTED">
                {registrationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="ascapWorkId">ASCAP work ID</label>
              <input id="ascapWorkId" name="ascapWorkId" />
            </div>
            <div className={styles.field}>
              <label htmlFor="bmiWorkId">BMI work ID</label>
              <input id="bmiWorkId" name="bmiWorkId" />
            </div>
          </div>

          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="writers">Writers</label>
              <textarea id="writers" name="writers" placeholder="Writer credits, collaborators, and publishing notes." />
            </div>
            <div className={styles.field}>
              <label htmlFor="producers">Producers</label>
              <textarea id="producers" name="producers" placeholder="Production credits and collaborators." />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="splitNotes">Split notes</label>
            <textarea id="splitNotes" name="splitNotes" placeholder="Ownership splits, admin notes, or follow-up reminders." />
          </div>

          <div className={styles.field}>
            <label htmlFor="lyrics">Lyrics</label>
            <textarea id="lyrics" name="lyrics" placeholder="Paste official lyrics here." />
          </div>

          <label className={styles.help}>
            <input type="checkbox" name="explicit" style={{ marginRight: "0.5rem" }} /> Explicit lyrics
          </label>

          <div className={styles.actions}>
            <button className={styles.button} type="submit">
              Save track
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
