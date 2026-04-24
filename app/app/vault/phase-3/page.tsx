import Link from "next/link";
import styles from "@/app/vault/ui.module.css";

export default function PhaseThreeHubPage() {
  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Workspace</div>
        <h2 className={styles.title}>Expansion hub</h2>
        <p className={styles.help}>
          Workspace adds three major tools on top of the authenticated catalog: a rights dashboard, a public-link importer, and a press kit
          generator with an exportable presentation view.
        </p>
      </section>

      <section className={styles.features}>
        <div className={styles.card}>
          <div className={styles.eyebrow}>Rights</div>
          <h3>ASCAP / BMI dashboard</h3>
          <p className={styles.help}>See which tracks still need IDs, lyrics, writers, or registration status updates.</p>
          <Link className={styles.button} href="/vault/rights">
            Open rights dashboard
          </Link>
        </div>

        <div className={styles.card}>
          <div className={styles.eyebrow}>Import</div>
          <h3>Discography importer</h3>
          <p className={styles.help}>Scan saved artist links, detect release candidates, and turn them into draft releases.</p>
          <Link className={styles.button} href="/vault/imports">
            Open importer
          </Link>
        </div>

        <div className={styles.card}>
          <div className={styles.eyebrow}>Press</div>
          <h3>Press kit workspace</h3>
          <p className={styles.help}>Save polished bios and contact details, then open a clean export page for presentation.</p>
          <Link className={styles.button} href="/vault/press-kit">
            Open press kit
          </Link>
        </div>
      </section>
    </div>
  );
}
