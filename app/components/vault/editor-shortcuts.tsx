import Link from "next/link";
import styles from "@/app/vault/ui.module.css";

type EditorShortcutsProps = {
  title: string;
  description: string;
  mediaHint?: string;
};

export function EditorShortcuts({ title, description, mediaHint }: EditorShortcutsProps) {
  return (
    <section className={styles.card}>
      <div className={styles.eyebrow}>{title}</div>
      <h2 className={styles.title}>Workflow shortcuts</h2>
      <p className={styles.help}>{description}</p>
      <div className={styles.actions}>
        <Link className={styles.buttonSecondary} href="/vault/media">
          Open media library
        </Link>
        <Link className={styles.buttonSecondary} href="/vault/imports/advanced">
          Open manual importer
        </Link>
        <Link className={styles.buttonSecondary} href="/vault/press-kit">
          Open press kit
        </Link>
      </div>
      <p className={styles.help}>
        {mediaHint ??
          "Upload files in the media library first, then paste returned URLs into cover art, hero image, master file, or preview fields in this editor."}
      </p>
    </section>
  );
}
