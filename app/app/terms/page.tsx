import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  const session = await getSession();

  return (
    <div className="marketing-shell">
      <SiteHeader signedIn={Boolean(session)} />
      <main className="container marketing-page__content">
        <section className="marketing-page__hero marketing-card legal-copy">
          <div className="eyebrow">Terms</div>
          <h1>Terms of Service</h1>
          <p>
            AIArtistVault provides organizational tooling for artist metadata, rights tracking, and press asset management. Users are responsible for the accuracy of the information they store, including ownership details, rights data, and public-facing press kit content.
          </p>
          <p>
            The service owner may suspend abusive or unlawful use. Public sharing features should only be used for material the user has the right to publish. Future paid plans, collaborator access, and workspace features may introduce additional service terms.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
