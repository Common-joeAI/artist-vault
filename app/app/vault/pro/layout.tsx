import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/app/vault/ui.module.css";

export default function ProLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Workspace</div>
        <h2 className={styles.title}>Release workspace</h2>
        <p className={styles.help}>
          Manage uploads, imports, rights, and press materials in one place.
        </p>
        <div className={styles.actions}>
          <Link className={styles.button} href="/vault/media">Media library</Link>
          <Link className={styles.buttonSecondary} href="/vault/imports/advanced">Manual importer</Link>
          <Link className={styles.buttonSecondary} href="/vault/rights">Rights dashboard</Link>
          <Link className={styles.buttonSecondary} href="/vault/pro/press-kit">Press editor</Link>
        </div>
      </section>

      {children}
    </div>
  );
}
