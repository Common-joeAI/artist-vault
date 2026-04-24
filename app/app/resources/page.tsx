import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth";

const resources = [
  {
    title: "Release readiness checklist",
    copy: "A practical checklist for metadata, credits, links, artwork, rights, and press assets before release day.",
  },
  {
    title: "AI artist press kit framework",
    copy: "Structure your bio, talking points, visuals, and platform links so your press kit feels coherent and professional.",
  },
  {
    title: "Rights tracking starter guide",
    copy: "Learn how to keep ISRCs, writer splits, PRO statuses, and registration notes tied to the right release records.",
  },
];

export const metadata = { title: "Resources" };

export default async function ResourcesPage() {
  const session = await getSession();

  return (
    <div className="marketing-shell">
      <SiteHeader signedIn={Boolean(session)} />
      <main className="container marketing-page__content">
        <section className="marketing-page__hero marketing-card">
          <div className="eyebrow">Resources</div>
          <h1>Guides for artists who want cleaner release operations</h1>
          <p>
            Use these resource concepts as the beginning of your content engine and onboarding education layer. They are built to support indie artists who hate spreadsheet chaos.
          </p>
        </section>

        <section className="marketing-grid marketing-section">
          {resources.map((resource) => (
            <article className="marketing-card" key={resource.title}>
              <h2>{resource.title}</h2>
              <p>{resource.copy}</p>
              <Link className="inline-link" href="/signup">Create your vault</Link>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
