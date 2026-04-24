import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const session = await getSession();

  return (
    <div className="marketing-shell">
      <SiteHeader signedIn={Boolean(session)} />
      <main className="container marketing-page__content">
        <section className="marketing-page__hero marketing-card legal-copy">
          <div className="eyebrow">Privacy</div>
          <h1>Privacy Policy</h1>
          <p>
            AIArtistVault is designed to keep vault data private by default. Artist metadata, releases, rights information, and uploaded assets should only be visible to authenticated account holders and any future collaborators they explicitly invite.
          </p>
          <p>
            Public visibility should only occur through intentionally published assets such as press kit links. Operational logs, fraud prevention, and basic service diagnostics may be retained to keep the platform stable and secure.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
