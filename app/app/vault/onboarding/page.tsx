import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import styles from "@/app/vault/ui.module.css";

export default async function VaultOnboardingPage() {
  const profile = await getPrimaryArtistProfile();

  const links = new Map(profile?.links.map((link) => [link.platform, link.url]) ?? []);

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Onboarding</div>
        <h2 className={styles.title}>Create or update the artist profile</h2>
        <p className={styles.help}>
          This wizard builds the primary artist record used across releases, registration workflows, and future press kit generation.
          It stores artist metadata and public artist page links in the vault database.
        </p>
      </section>

      <OnboardingWizard
        defaultValues={{
          name: profile?.name ?? "",
          bio: profile?.bio ?? "",
          photoUrl: profile?.photoUrl ?? "",
          spotifyUrl: links.get("spotify") ?? "",
          appleMusicUrl: links.get("apple_music") ?? "",
          youtubeMusicUrl: links.get("youtube_music") ?? "",
          websiteUrl: links.get("website") ?? "",
          otherUrl: links.get("other") ?? "",
        }}
      />
    </div>
  );
}
