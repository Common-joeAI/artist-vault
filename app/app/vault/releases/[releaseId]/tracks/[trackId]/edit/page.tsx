import { notFound } from "next/navigation";
import { getReleaseById } from "@/lib/artist-vault";
import { updateTrackAction } from "@/app/vault/catalog-actions";
import { AssetUrlPicker } from "@/components/uploads/asset-url-picker";
import { InlineAssetUpload } from "@/components/uploads/inline-asset-upload";
import styles from "@/app/vault/ui.module.css";

const registrationStatuses = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "APPROVED"] as const;

export default async function EditTrackPage({ params }: { params: Promise<{ releaseId: string; trackId: string }> }) {
  const { releaseId, trackId } = await params;
  const release = await getReleaseById(releaseId);
  const track = release?.tracks.find((item) => item.id === trackId);

  if (!release || !track) {
    notFound();
  }

  const action = updateTrackAction.bind(null, release.id, track.id);

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Edit track</div>
        <h2 className={styles.title}>{track.title}</h2>
        <form action={action} className={styles.form}>
          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="title">Track title</label>
              <input id="title" name="title" defaultValue={track.title} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="trackNumber">Track number</label>
              <input id="trackNumber" name="trackNumber" type="number" min="1" defaultValue={track.trackNumber ?? ""} />
            </div>
          </div>

          <div className={styles.columns3}>
            <div className={styles.field}>
              <label htmlFor="isrc">ISRC</label>
              <input id="isrc" name="isrc" defaultValue={track.isrc ?? ""} />
            </div>
            <div className={styles.field}>
              <label htmlFor="durationSeconds">Duration (seconds)</label>
              <input id="durationSeconds" name="durationSeconds" type="number" min="1" defaultValue={track.durationSeconds ?? ""} />
            </div>
            <div className={styles.field}>
              <label htmlFor="bpm">BPM</label>
              <input id="bpm" name="bpm" type="number" min="1" defaultValue={track.bpm ?? ""} />
            </div>
          </div>

          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="masterFileUrl">Master file URL</label>
              <input id="masterFileUrl" name="masterFileUrl" defaultValue={track.masterFileUrl ?? ""} />
            </div>
            <div className={styles.field}>
              <label htmlFor="audioPreviewUrl">Preview URL</label>
              <input id="audioPreviewUrl" name="audioPreviewUrl" defaultValue={track.audioPreviewUrl ?? ""} />
            </div>
          </div>

          <InlineAssetUpload
            inputId="masterFileUrl"
            defaultCategory="masters"
            title="Upload replacement master"
            helpText="Upload a new master file and replace the stored URL without leaving this page."
          />
          <AssetUrlPicker inputId="masterFileUrl" defaultCategory="masters" label="Use existing uploaded masters" />

          <InlineAssetUpload
            inputId="audioPreviewUrl"
            defaultCategory="previews"
            title="Upload replacement preview"
            helpText="Upload a new preview file and replace the stored preview URL in one step."
          />
          <AssetUrlPicker inputId="audioPreviewUrl" defaultCategory="previews" label="Use existing uploaded previews" />

          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="ascapStatus">ASCAP status</label>
              <select id="ascapStatus" name="ascapStatus" defaultValue={track.ascapStatus}>
                {registrationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="bmiStatus">BMI status</label>
              <select id="bmiStatus" name="bmiStatus" defaultValue={track.bmiStatus}>
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
              <input id="ascapWorkId" name="ascapWorkId" defaultValue={track.ascapWorkId ?? ""} />
            </div>
            <div className={styles.field}>
              <label htmlFor="bmiWorkId">BMI work ID</label>
              <input id="bmiWorkId" name="bmiWorkId" defaultValue={track.bmiWorkId ?? ""} />
            </div>
          </div>

          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="writers">Writers</label>
              <textarea id="writers" name="writers" defaultValue={track.writers ?? ""} />
            </div>
            <div className={styles.field}>
              <label htmlFor="producers">Producers</label>
              <textarea id="producers" name="producers" defaultValue={track.producers ?? ""} />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="splitNotes">Split notes</label>
            <textarea id="splitNotes" name="splitNotes" defaultValue={track.splitNotes ?? ""} />
          </div>

          <div className={styles.field}>
            <label htmlFor="lyrics">Lyrics</label>
            <textarea id="lyrics" name="lyrics" defaultValue={track.lyrics ?? ""} />
          </div>

          <label className={styles.help}>
            <input type="checkbox" name="explicit" defaultChecked={track.explicit} style={{ marginRight: "0.5rem" }} /> Explicit lyrics
          </label>

          <div className={styles.actions}>
            <button className={styles.button} type="submit">
              Update track
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
