import { redirect } from "next/navigation";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { createReleaseAction } from "@/app/vault/catalog-actions";
import { AssetUrlPicker } from "@/components/uploads/asset-url-picker";
import { AssetBrowserModal } from "@/components/uploads/asset-browser-modal";
import { EditorShortcuts } from "@/components/vault/editor-shortcuts";
import styles from "@/app/vault/ui.module.css";
import Link from "next/link";

export default async function ReleaseWorkflowPage() {
  const profile = await getPrimaryArtistProfile();
  if (!profile) redirect("/vault/onboarding");

  return (
    <div className={styles.grid}>
      <EditorShortcuts title="Release workflow" description="Use quick-pick or modal browsing to choose uploaded assets while creating a release." mediaHint="Use the modal browser for a richer asset search experience or the inline picker for quick selection." />
      <div style={{ marginTop: "12px" }}>
        <Link
          href="/vault/pro/releases/import/distrokid"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 14px",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: 600,
            border: "1px solid rgba(255,255,255,0.12)"
          }}
        >
          DistroKid importer
        </Link>
      </div>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Release workflow</div>
        <h2 className={styles.title}>Add a single, EP, or album</h2>
        <form action={createReleaseAction} className={styles.form}>
          <div className={styles.columns2}><div className={styles.field}><label htmlFor="title">Release title</label><input id="title" name="title" required /></div><div className={styles.field}><label htmlFor="releaseType">Release type</label><select id="releaseType" name="releaseType" defaultValue="SINGLE"><option value="SINGLE">Single</option><option value="EP">EP</option><option value="ALBUM">Album</option></select></div></div>
          <div className={styles.columns2}><div className={styles.field}><label htmlFor="distributor">Distributor</label><input id="distributor" name="distributor" /></div><div className={styles.field}><label htmlFor="releaseDate">Release date</label><input id="releaseDate" name="releaseDate" type="date" /></div></div>
          <div className={styles.field}><label htmlFor="coverArtUrl">Cover art URL</label><input id="coverArtUrl" name="coverArtUrl" placeholder="Choose from uploaded cover assets or paste a URL" /></div>
          <div className={styles.actions}><AssetBrowserModal inputId="coverArtUrl" defaultCategory="covers" label="Browse cover assets" /></div>
          <AssetUrlPicker inputId="coverArtUrl" defaultCategory="covers" label="Quick pick cover asset" />
          <div className={styles.columns3}><div className={styles.field}><label htmlFor="spotifyUrl">Spotify URL</label><input id="spotifyUrl" name="spotifyUrl" /></div><div className={styles.field}><label htmlFor="appleMusicUrl">Apple Music URL</label><input id="appleMusicUrl" name="appleMusicUrl" /></div><div className={styles.field}><label htmlFor="youtubeMusicUrl">YouTube Music URL</label><input id="youtubeMusicUrl" name="youtubeMusicUrl" /></div></div>
          <div className={styles.field}><label htmlFor="notes">Notes</label><textarea id="notes" name="notes" /></div>
          <div className={styles.actions}><button className={styles.button} type="submit">Save release</button></div>
        </form>
      </section>
    </div>
  );
}