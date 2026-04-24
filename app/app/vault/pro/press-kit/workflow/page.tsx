import Link from "next/link";
import { getPrimaryArtistProfile, formatDisplayDate } from "@/lib/artist-vault";
import { savePressKitAction } from "@/app/vault/press-kit/actions";
import { AssetUrlPicker } from "@/components/uploads/asset-url-picker";
import { AssetBrowserModal } from "@/components/uploads/asset-browser-modal";
import { EditorShortcuts } from "@/components/vault/editor-shortcuts";
import styles from "@/app/vault/ui.module.css";

export default async function PressWorkflowPage() {
  const profile = await getPrimaryArtistProfile();
  const pressKit = profile?.pressKits?.[0] ?? null;
  const releases = profile?.releases?.slice(0, 5) ?? [];

  return (
    <div className={styles.grid}>
      <EditorShortcuts title="Press workflow" description="Use quick-pick or modal browsing to choose uploaded press assets while editing the press kit." mediaHint="Use the modal browser for a richer search experience or the quick picker for faster selection." />
      <section className={styles.card}>
        <div className={styles.eyebrow}>Press workflow</div>
        <h2 className={styles.title}>{pressKit?.title ?? `${profile?.name ?? "Artist"} Press Kit`}</h2>
        <div className={styles.actions}><Link className={styles.buttonSecondary} href="/vault/press-kit/export">Open export view</Link><a className={styles.buttonSecondary} href="/api/press-kit/pdf">Download PDF</a></div>
        <form action={savePressKitAction} className={styles.form}>
          <div className={styles.columns2}><div className={styles.field}><label htmlFor="title">Press kit title</label><input id="title" name="title" defaultValue={pressKit?.title ?? `${profile?.name ?? "Artist"} Press Kit`} /></div><div className={styles.field}><label htmlFor="contactEmail">Contact email</label><input id="contactEmail" name="contactEmail" type="email" defaultValue={pressKit?.contactEmail ?? ""} /></div></div>
          <div className={styles.field}><label htmlFor="heroImageUrl">Hero image URL</label><input id="heroImageUrl" name="heroImageUrl" defaultValue={pressKit?.heroImageUrl ?? profile?.photoUrl ?? ""} /></div>
          <div className={styles.actions}><AssetBrowserModal inputId="heroImageUrl" defaultCategory="press" label="Browse press assets" /></div>
          <AssetUrlPicker inputId="heroImageUrl" defaultCategory="press" label="Quick pick press asset" />
          <div className={styles.field}><label htmlFor="websiteUrl">Website URL</label><input id="websiteUrl" name="websiteUrl" defaultValue={pressKit?.websiteUrl ?? profile?.links.find((link) => link.platform === "website")?.url ?? ""} /></div>
          <div className={styles.field}><label htmlFor="shortBio">Short bio</label><textarea id="shortBio" name="shortBio" defaultValue={pressKit?.shortBio ?? profile?.bio ?? ""} /></div>
          <div className={styles.field}><label htmlFor="longBio">Long bio</label><textarea id="longBio" name="longBio" defaultValue={pressKit?.longBio ?? profile?.bio ?? ""} /></div>
          <div className={styles.actions}><button className={styles.button} type="submit">Save press kit</button></div>
        </form>
      </section>
      <section className={styles.card}><div className={styles.eyebrow}>Preview</div><h2 className={styles.title}>{pressKit?.title ?? `${profile?.name ?? "Artist"} Press Kit`}</h2><div className={styles.meta}>Updated {pressKit ? formatDisplayDate(pressKit.generatedAt) : "Not saved yet"}</div><div className={styles.meta}>{releases.length ? releases.map((release) => release.title).join(" · ") : "No releases to feature yet."}</div></section>
    </div>
  );
}
