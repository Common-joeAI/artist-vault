import Link from "next/link";
import styles from "@/app/vault/ui.module.css";

export default function ProHomePage() {
  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Workspace</div>
        <h2 className={styles.title}>Vault home</h2>
        <p className={styles.help}>Welcome back. Choose where to start with your catalog, imports, and release tools.</p>
        <div className={styles.actions}>
          <Link className={styles.button} href="/vault/pro/releases/new/workflow">New release workflow</Link>
          <Link className={styles.buttonSecondary} href="/vault/media">Media library</Link>
          <Link className={styles.buttonSecondary} href="/vault/pro/press-kit/workflow">Press workflow</Link>
        </div>
      </section>
    </div>
  );
}
