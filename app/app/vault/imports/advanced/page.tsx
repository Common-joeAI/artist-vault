import { AdvancedImportManager } from "@/components/imports/advanced-import-manager";
import styles from "@/app/vault/ui.module.css";

export default function AdvancedImportsPage() {
  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Manual importer</div>
        <h2 className={styles.title}>Manual release import</h2>
        <p className={styles.help}>
          Paste artist pages or release URLs directly for a stronger manual scan. This pass adds platform-aware title cleanup, surfaces curated
          release candidates, and can now push those candidates into the vault as release drafts so you have a real database import path.
        </p>
      </section>

      <AdvancedImportManager />
    </div>
  );
}
