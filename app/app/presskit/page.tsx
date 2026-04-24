import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Press Kits",
};

export default async function PublicPressKitPage() {
  const session = await getSession();

  return (
    <div className="marketing-shell">
      <SiteHeader signedIn={Boolean(session)} />
      <main className="container marketing-page__content">
        <section className="marketing-page__hero marketing-card">
          <div className="eyebrow">Press kit links</div>
          <h1>Public press kits are shared with unique links</h1>
          <p>
            Each artist press kit is published to its own unique URL. Create an account to build yours, manage release metadata, and publish a shareable press-ready page when you are ready.
          </p>
          <div className="marketing-actions">
            <Link className="button button--primary" href={session ? "/vault/press-kit" : "/signup"}>
              {session ? "Open press kit workspace" : "Create your free vault"}
            </Link>
            <Link className="button button--ghost" href="/">Back to home</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
