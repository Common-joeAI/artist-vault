import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth";

const faqs = [
  {
    question: "Is AIArtistVault only for AI-generated music?",
    answer: "No. It works for AI-assisted artists, indie musicians, producers, and labels that need a cleaner release workflow.",
  },
  {
    question: "Does it replace my distributor?",
    answer: "No. AIArtistVault complements distributors by helping you manage the metadata, rights details, and press assets around each release.",
  },
  {
    question: "Is my vault public?",
    answer: "No. Vault content is private by default. Public sharing should only happen through deliberate outputs such as press kit links.",
  },
  {
    question: "Can I invite collaborators?",
    answer: "That is part of the roadmap. This patch establishes a user-facing account foundation and individual vault ownership.",
  },
];

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const session = await getSession();

  return (
    <div className="marketing-shell">
      <SiteHeader signedIn={Boolean(session)} />
      <main className="container marketing-page__content">
        <section className="marketing-page__hero marketing-card">
          <div className="eyebrow">Support</div>
          <h1>Answers for busy artists and release managers</h1>
          <p>Use this page as the public support layer while you grow a fuller help center and in-app onboarding system.</p>
        </section>

        <section className="faq-list marketing-section">
          {faqs.map((item) => (
            <article className="marketing-card faq-card" key={item.question}>
              <h2>{item.question}</h2>
              <p>{item.answer}</p>
            </article>
          ))}
        </section>

        <section className="marketing-card marketing-section">
          <h2>Need to start now?</h2>
          <p className="section-copy">Create your account, then complete onboarding to add your artist profile, first release, and rights data.</p>
          <Link className="button button--primary" href="/signup">Create your free vault</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
