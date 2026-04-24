import Link from "next/link";
import styles from "@/app/vault/ui.module.css";

const sections = [
  {
    title: "Profile and onboarding",
    description: "Set artist identity, bios, and public links before importing or generating press materials.",
    href: "/vault/onboarding",
    cta: "Open onboarding",
  },
  {
    title: "Catalog management",
    description: "Jump into release and track editing with media-library shortcuts and stronger workflow guidance.",
    href: "/vault/studio/releases/new",
    cta: "Create release",
  },
  {
    title: "Rights admin",
    description: "Review which songs still need ISRCs, lyric copy, writer credits, or ASCAP/BMI completion.",
    href: "/vault/rights",
    cta: "Open rights dashboard",
  },
  {
    title: "Imports",
    description: "Use saved links or paste public URLs directly to generate draft release candidates faster.",
    href: "/vault/imports/advanced",
    cta: "Open manual importer",
  },
  {
    title: "Media uploads",
    description: "Upload cover art, press images, masters, and previews to self-hosted local storage.",
    href: "/vault/media",
    cta: "Open media library",
  },
  {
    title: "Press kit",
    description: "Edit the artist one-sheet, open the export view, or download the PDF version.",
    href: "/vault/studio/press-kit",
    cta: "Open press kit studio",
  },
];

export default function StudioPage() {
  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Workspace</div>
        <h2 className={styles.title}>Artist Vault studio</h2>
        <p className={styles.help}>
          This cleanup layer gives you a single place to navigate the app and editor-specific routes that keep uploads, imports, rights,
          and press workflows close at hand while you edit releases and tracks.
        </p>
        <div className={styles.actions}>
          <Link className={styles.button} href="/vault/releases">
            Catalog index
          </Link>
          <Link className={styles.buttonSecondary} href="/vault/phase-4">
            Workspace hub
          </Link>
        </div>
      </section>

      <section className={styles.grid}>
        {sections.map((section) => (
          <div className={styles.card} key={section.href}>
            <div className={styles.eyebrow}>{section.title}</div>
            <h3 className={styles.title}>{section.title}</h3>
            <p className={styles.help}>{section.description}</p>
            <Link className={styles.button} href={section.href}>
              {section.cta}
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
