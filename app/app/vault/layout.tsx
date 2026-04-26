import Link from "next/link";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { signOutAction } from "@/app/vault/auth-actions";
import { db } from "@/lib/db";
import styles from "./vault.module.css";

export default async function VaultLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  // Radio stations shouldn't be in the artist vault
  if (session.role === "radio_station") {
    const { redirect } = await import("next/navigation");
    redirect("/radio/dashboard");
  }

  const profile = await getPrimaryArtistProfile();

  // Count release-ready releases
  const readyCount = profile
    ? await db.release.count({
        where: { artistId: profile.id, isReleaseReady: true },
      })
    : 0;

  // Get PRO org
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { proOrg: true },
  });

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>🎵 Artist Vault</div>
        <p className={styles.copy}>
          {profile?.name ?? "Your artist workspace"}
        </p>

        <nav className={styles.nav}>
          <Link href="/vault">🏠 Dashboard</Link>
          <Link href="/vault/releases">💿 Releases</Link>
          <Link href="/vault/media">🎧 Media & Masters</Link>
          <Link href="/vault/import">📥 Import Music</Link>
          <Link href="/vault/discovery">🔍 AI Discovery</Link>
          <Link href="/vault/pro">
            🎼 PRO Registration
            {user?.proOrg && (
              <span className={styles.proBadge}>{user.proOrg}</span>
            )}
          </Link>
          <Link href="/vault/press-kit">
            📄 Press Kit
          </Link>
          <Link href="/vault/rights">⚖️ Rights & Licensing</Link>
        </nav>

        {readyCount > 0 && (
          <div className={styles.readyBanner}>
            <div className={styles.readyCount}>{readyCount}</div>
            <div>
              <strong>Release{readyCount !== 1 ? "s" : ""} ready</strong>
              <div className={styles.copy} style={{ fontSize: "0.8rem" }}>
                Radio stations have been notified
              </div>
            </div>
          </div>
        )}

        <div className={styles.status}>
          <div><strong>Signed in as</strong></div>
          <div className={styles.copy}>{session.email}</div>
          <div style={{ marginTop: "0.75rem" }}>
            <strong>Artist profile</strong>
          </div>
          <div className={styles.copy}>{profile?.name ?? "Not onboarded yet"}</div>
          {!profile && (
            <Link href="/vault/onboarding" className={styles.onboardingLink}>
              Complete onboarding →
            </Link>
          )}
        </div>

        <form action={signOutAction} style={{ marginTop: "1rem" }}>
          <button className={styles.signout} type="submit">
            Sign out
          </button>
        </form>
      </aside>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.heading}>
              {profile?.name ? `${profile.name}'s Vault` : "Vault workspace"}
            </h1>
            <div className={styles.subheading}>
              Manage your releases, masters, rights, and press kits.
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
