import { UploadManager } from "@/components/uploads/upload-manager";
import styles from "@/app/vault/ui.module.css";

export default function MediaPage() {
  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Media library</div>
        <h2 className={styles.title}>Local media library</h2>
        <p className={styles.help}>
          Upload images and audio files into local self-hosted storage, then reuse the returned URLs inside release records, track masters,
          preview links, and press kit hero images.
        </p>
      </section>

      <UploadManager />
    </div>
  );
}
