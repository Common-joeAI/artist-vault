import Link from "next/link";
import { getPrimaryArtistProfile, formatDisplayDate } from "@/lib/artist-vault";
import styles from "@/app/vault/ui.module.css";

function summarizeStatuses(values: string[]) {
  return {
    notStarted: values.filter((value) => value === "NOT_STARTED").length,
    inProgress: values.filter((value) => value === "IN_PROGRESS").length,
    submitted: values.filter((value) => value === "SUBMITTED").length,
    approved: values.filter((value) => value === "APPROVED").length,
  };
}

export default async function RightsDashboardPage() {
  const profile = await getPrimaryArtistProfile();
  const releases = profile?.releases ?? [];
  const tracks = releases.flatMap((release) => release.tracks.map((track) => ({ ...track, releaseTitle: release.title, releaseId: release.id })));

  const ascapSummary = summarizeStatuses(tracks.map((track) => track.ascapStatus));
  const bmiSummary = summarizeStatuses(tracks.map((track) => track.bmiStatus));

  const needsAttention = tracks.filter(
    (track) =>
      !track.isrc ||
      !track.lyrics ||
      !track.writers ||
      track.ascapStatus !== "APPROVED" ||
      track.bmiStatus !== "APPROVED",
  );

  const readyTracks = tracks.filter((track) => track.ascapStatus === "APPROVED" && track.bmiStatus === "APPROVED");

  return (
    <div className={styles.grid}>
      <section className={styles.stats}>
        <div className={styles.card}>
          <div className={styles.label}>Tracks in vault</div>
          <div className={styles.value}>{tracks.length}</div>
          <div className={styles.meta}>All songs with track-level rights and metadata fields.</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>ASCAP approved</div>
          <div className={styles.value}>{ascapSummary.approved}</div>
          <div className={styles.meta}>In progress: {ascapSummary.inProgress} · Submitted: {ascapSummary.submitted}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>BMI approved</div>
          <div className={styles.value}>{bmiSummary.approved}</div>
          <div className={styles.meta}>In progress: {bmiSummary.inProgress} · Submitted: {bmiSummary.submitted}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Needs cleanup</div>
          <div className={styles.value}>{needsAttention.length}</div>
          <div className={styles.meta}>Tracks missing IDs, lyrics, writers, or final registration status.</div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.eyebrow}>Rights dashboard</div>
        <h2 className={styles.title}>Action queue</h2>
        <p className={styles.help}>
          Use this page to spot tracks that still need ISRCs, lyric copy, writer details, or final ASCAP and BMI registration updates.
        </p>
      </section>

      <section className={styles.card}>
        <div className={styles.eyebrow}>Needs attention</div>
        <h2 className={styles.title}>Tracks that are not fully ready</h2>
        {needsAttention.length ? (
          <div className={styles.list}>
            {needsAttention.map((track) => (
              <div className={styles.listItem} key={track.id}>
                <div>
                  <div><strong>{track.title}</strong></div>
                  <div className={styles.meta}>{track.releaseTitle}</div>
                  <div className={styles.meta}>
                    ISRC: {track.isrc || "Missing"} · Lyrics: {track.lyrics ? "Saved" : "Missing"} · Writers: {track.writers ? "Saved" : "Missing"}
                  </div>
                  <div className={styles.meta}>
                    ASCAP: {track.ascapStatus} · BMI: {track.bmiStatus} · Updated {formatDisplayDate(track.updatedAt)}
                  </div>
                </div>
                <Link className={styles.inlineLink} href={`/vault/releases/${track.releaseId}/tracks/${track.id}/edit`}>
                  Open track
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Everything currently in the vault looks registration-ready.</p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.eyebrow}>Approved</div>
        <h2 className={styles.title}>Tracks fully approved in both societies</h2>
        {readyTracks.length ? (
          <div className={styles.list}>
            {readyTracks.map((track) => (
              <div className={styles.listItem} key={track.id}>
                <div>
                  <div><strong>{track.title}</strong></div>
                  <div className={styles.meta}>{track.releaseTitle}</div>
                </div>
                <span className={styles.statusPill}>ASCAP + BMI approved</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No tracks are fully approved in both ASCAP and BMI yet.</p>
        )}
      </section>
    </div>
  );
}
