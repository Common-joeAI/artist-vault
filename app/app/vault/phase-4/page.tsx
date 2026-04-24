import Link from "next/link";
import styles from "@/app/vault/ui.module.css";

export default function PhaseFourPage() {
  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Workspace</div>
        <h2 className={styles.title}>Media, PDF, and stronger import tools</h2>
        <p className={styles.help}>
          Workspace pushes Artist Vault beyond metadata-only management. This pass adds local media uploads, a downloadable press kit PDF,
          and a stronger manual import flow for public artist and release links.
        </p>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.eyebrow}>Uploads</div>
          <h3 className={styles.title}>Local media library</h3>
          <p className={styles.help}>Upload covers, press art, masters, previews, and miscellaneous assets into self-hosted local storage.</p>
          <Link className={styles.button} href="/vault/media">
            Open media library
          </Link>
        </div>

        <div className={styles.card}>
          <div className={styles.eyebrow}>PDF</div>
          <h3 className={styles.title}>Press kit download</h3>
          <p className={styles.help}>Generate a downloadable PDF version of the current press kit directly from vault data.</p>
          <a className={styles.button} href="/api/press-kit/pdf">
            Download press kit PDF
          </a>
        </div>

        <div className={styles.card}>
          <div className={styles.eyebrow}>Import</div>
          <h3 className={styles.title}>Manual importer</h3>
          <p className={styles.help}>Paste public URLs directly and run a platform-aware scan with curated release candidates.</p>
          <Link className={styles.button} href="/vault/imports/advanced">
            Open manual importer
          </Link>
        </div>
      </section>
    </div>
  );
}
