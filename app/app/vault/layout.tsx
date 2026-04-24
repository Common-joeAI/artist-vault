import Link from "next/link";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { signOutAction } from "@/app/vault/auth-actions";
import styles from "./vault.module.css";

export default async function VaultLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const profile = await getPrimaryArtistProfile();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        
        <div className={styles.brand}>Artist Vault</div>
        <p className={styles.copy}>Manage your artist profile, releases, tracks, and rights information in one secure workspace.</p>

        <nav className={styles.nav}>
          <Link href="/vault">Dashboard</Link>
          <Link href="/vault/onboarding">Onboarding</Link>
          <Link href="/vault/releases">Releases</Link>
        </nav>

        <div className={styles.status}>
          <div><strong>Signed in as</strong></div>
          <div className={styles.copy}>{session.email}</div>
          <div style={{ marginTop: "0.75rem" }}>
            <strong>Artist profile</strong>
          </div>
          <div className={styles.copy}>{profile?.name ?? "Not onboarded yet"}</div>
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.heading}>Vault workspace</h1>
            <div className={styles.subheading}>Manage your artist identity, releases, tracks, and registration status in one place.</div>
          </div>

          <form action={signOutAction}>
            <button className={styles.signout} type="submit">
              Sign out
            </button>
          </form>
        </div>

        {children}
      </div>
    </div>
  );
}
