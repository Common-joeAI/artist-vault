import Link from "next/link";
import { getPrimaryArtistProfile, formatDisplayDate } from "@/lib/artist-vault";
import { savePressKitAction } from "@/app/vault/press-kit/actions";
import styles from "@/app/vault/ui.module.css";

export default async function PressKitPage() {
  const profile = await getPrimaryArtistProfile();
  const pressKit = profile?.pressKits?.[0] ?? null;
  const releases = profile?.releases?.slice(0, 5) ?? [];

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Press kit generator</div>
        <h2 className={styles.title}>Build your professional one-sheet</h2>
        <p className={styles.help}>
          This workspace lets you turn the artist profile and catalog into a reusable press kit. Save polished bios, contact details, a hero
          image, and a site link, then open the export route for a clean presentation page.
        </p>
        <div className={styles.actions}>
          <Link className={styles.buttonSecondary} href="/vault/press-kit/export">
            Open export view
          </Link>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.eyebrow}>Editor</div>
        <h2 className={styles.title}>{pressKit?.title ?? `${profile?.name ?? "Artist"} Press Kit`}</h2>
        <form action={savePressKitAction} className={styles.form}>
          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="title">Press kit title</label>
              <input id="title" name="title" defaultValue={pressKit?.title ?? `${profile?.name ?? "Artist"} Press Kit`} />
            </div>
            <div className={styles.field}>
              <label htmlFor="contactEmail">Contact email</label>
              <input id="contactEmail" name="contactEmail" type="email" defaultValue={pressKit?.contactEmail ?? ""} />
            </div>
          </div>

          <div className={styles.columns2}>
            <div className={styles.field}>
              <label htmlFor="heroImageUrl">Hero image URL</label>
              <input id="heroImageUrl" name="heroImageUrl" defaultValue={pressKit?.heroImageUrl ?? profile?.photoUrl ?? ""} />
            </div>
            <div className={styles.field}>
              <label htmlFor="websiteUrl">Website URL</label>
              <input id="websiteUrl" name="websiteUrl" defaultValue={pressKit?.websiteUrl ?? profile?.links.find((link) => link.platform === "website")?.url ?? ""} />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="shortBio">Short bio</label>
            <textarea id="shortBio" name="shortBio" defaultValue={pressKit?.shortBio ?? profile?.bio ?? ""} />
          </div>

          <div className={styles.field}>
            <label htmlFor="longBio">Long bio</label>
            <textarea id="longBio" name="longBio" defaultValue={pressKit?.longBio ?? profile?.bio ?? ""} />
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit">
              Save press kit
            </button>
          </div>
        </form>
      </section>

      <section className={styles.card}>
        <div className={styles.eyebrow}>Preview</div>
        <h2 className={styles.title}>{pressKit?.title ?? `${profile?.name ?? "Artist"} Press Kit`}</h2>
        <div className={styles.meta}>Updated {pressKit ? formatDisplayDate(pressKit.generatedAt) : "Not saved yet"}</div>
        <p className={styles.help}>{pressKit?.shortBio ?? profile?.bio ?? "No short bio yet."}</p>
        <div className={styles.help}>{pressKit?.longBio ?? profile?.bio ?? "No long bio yet."}</div>

        <div className={styles.list}>
          <div>
            <strong>Contact</strong>
            <div className={styles.meta}>{pressKit?.contactEmail ?? "No contact email saved."}</div>
          </div>
          <div>
            <strong>Website</strong>
            <div className={styles.meta}>{pressKit?.websiteUrl ?? "No website link saved."}</div>
          </div>
          <div>
            <strong>Selected releases</strong>
            <div className={styles.meta}>
              {releases.length ? releases.map((release) => release.title).join(" · ") : "No releases to feature yet."}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
