import { ImportManager } from "@/components/imports/import-manager";
import styles from "@/app/vault/ui.module.css";

export default function ImportsPage() {
  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Importer</div>
        <h2 className={styles.title}>Public artist-page import</h2>
        <p className={styles.help}>
          This importer scans the public artist links already saved in onboarding, pulls page metadata, and looks for release candidates
          in JSON-LD or visible page hints. You can turn discovered items into draft releases in the vault, then clean up details manually.
        </p>
      </section>

      <ImportManager />
    </div>
  );
}
