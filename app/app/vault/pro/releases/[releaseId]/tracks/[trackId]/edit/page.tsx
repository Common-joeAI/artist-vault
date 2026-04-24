import { notFound } from "next/navigation";
import { getReleaseById } from "@/lib/artist-vault";
import { updateTrackAction } from "@/app/vault/catalog-actions";
import { AssetUrlPicker } from "@/components/uploads/asset-url-picker";
import { EditorShortcuts } from "@/components/vault/editor-shortcuts";
import styles from "@/app/vault/ui.module.css";

const statuses = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "APPROVED"] as const;

export default async function ProEditTrackPage({ params }: { params: Promise<{ releaseId: string; trackId: string }> }) {
  const { releaseId, trackId } = await params;
  const release = await getReleaseById(releaseId);
  const track = release?.tracks.find((item) => item.id === trackId);
  if (!release || !track) notFound();
  const action = updateTrackAction.bind(null, release.id, track.id);

  return (
    <div className={styles.grid}>
      <EditorShortcuts title="Track editor" description="Update track metadata with direct master and preview asset picking." mediaHint="Use uploaded masters and previews directly in the fields below." />
      <section className={styles.card}>
        <div className={styles.eyebrow}>Pro track editor</div>
        <h2 className={styles.title}>{track.title}</h2>
        <form action={action} className={styles.form}>
          <div className={styles.columns2}><div className={styles.field}><label htmlFor="title">Track title</label><input id="title" name="title" defaultValue={track.title} required /></div><div className={styles.field}><label htmlFor="trackNumber">Track number</label><input id="trackNumber" name="trackNumber" type="number" min="1" defaultValue={track.trackNumber ?? ""} /></div></div>
          <div className={styles.columns3}><div className={styles.field}><label htmlFor="isrc">ISRC</label><input id="isrc" name="isrc" defaultValue={track.isrc ?? ""} /></div><div className={styles.field}><label htmlFor="durationSeconds">Duration (seconds)</label><input id="durationSeconds" name="durationSeconds" type="number" min="1" defaultValue={track.durationSeconds ?? ""} /></div><div className={styles.field}><label htmlFor="bpm">BPM</label><input id="bpm" name="bpm" type="number" min="1" defaultValue={track.bpm ?? ""} /></div></div>
          <div className={styles.field}><label htmlFor="masterFileUrl">Master file URL</label><input id="masterFileUrl" name="masterFileUrl" defaultValue={track.masterFileUrl ?? ""} /></div>
          <AssetUrlPicker inputId="masterFileUrl" defaultCategory="masters" label="Choose from uploaded master assets" />
          <div className={styles.field}><label htmlFor="audioPreviewUrl">Preview URL</label><input id="audioPreviewUrl" name="audioPreviewUrl" defaultValue={track.audioPreviewUrl ?? ""} /></div>
          <AssetUrlPicker inputId="audioPreviewUrl" defaultCategory="previews" label="Choose from uploaded preview assets" />
          <div className={styles.columns2}><div className={styles.field}><label htmlFor="ascapStatus">ASCAP status</label><select id="ascapStatus" name="ascapStatus" defaultValue={track.ascapStatus}>{{}.constructor === Object ? null : null}{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div><div className={styles.field}><label htmlFor="bmiStatus">BMI status</label><select id="bmiStatus" name="bmiStatus" defaultValue={track.bmiStatus}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div></div>
          <div className={styles.columns2}><div className={styles.field}><label htmlFor="ascapWorkId">ASCAP work ID</label><input id="ascapWorkId" name="ascapWorkId" defaultValue={track.ascapWorkId ?? ""} /></div><div className={styles.field}><label htmlFor="bmiWorkId">BMI work ID</label><input id="bmiWorkId" name="bmiWorkId" defaultValue={track.bmiWorkId ?? ""} /></div></div>
          <div className={styles.columns2}><div className={styles.field}><label htmlFor="writers">Writers</label><textarea id="writers" name="writers" defaultValue={track.writers ?? ""} /></div><div className={styles.field}><label htmlFor="producers">Producers</label><textarea id="producers" name="producers" defaultValue={track.producers ?? ""} /></div></div>
          <div className={styles.field}><label htmlFor="splitNotes">Split notes</label><textarea id="splitNotes" name="splitNotes" defaultValue={track.splitNotes ?? ""} /></div>
          <div className={styles.field}><label htmlFor="lyrics">Lyrics</label><textarea id="lyrics" name="lyrics" defaultValue={track.lyrics ?? ""} /></div>
          <label className={styles.help}><input type="checkbox" name="explicit" defaultChecked={track.explicit} style={{ marginRight: "0.5rem" }} /> Explicit lyrics</label>
          <div className={styles.actions}><button className={styles.button} type="submit">Update track</button></div>
        </form>
      </section>
    </div>
  );
}
