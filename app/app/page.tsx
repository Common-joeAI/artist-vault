import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth";

const pillars = [
  {
    title: "Release command center",
    body: "Manage singles, EPs, albums, cover art, release dates, listening links, and rollout notes from one clean workspace.",
  },
  {
    title: "Rights and registrations",
    body: "Track ISRCs, lyrics, writers, splits, and ASCAP or BMI status without losing context across scattered spreadsheets.",
  },
  {
    title: "Press kit generation",
    body: "Turn your artist profile and release data into public-facing press-ready assets without duplicating work.",
  },
];

const workflows = [
  "Artist profile and platform links",
  "Release and track metadata management",
  "ISRC, lyrics, writer, and split tracking",
  "Imported draft creation from artist links",
  "Press kit publishing workflow",
  "Private-by-default release operations",
];

const timeline = [
  "Create your artist vault",
  "Add your artist profile and links",
  "Build your catalog and release records",
  "Track rights, registrations, and splits",
  "Generate your press kit and launch with confidence",
];


const faqs = [
  {
    question: "Is AIArtistVault only for AI-generated music?",
    answer: "No. It is for AI-assisted artists, independent musicians, producers, managers, and labels who need cleaner release operations.",
  },
  {
    question: "Will this replace my distributor?",
    answer: "No. It complements distributors by organizing the metadata, rights details, and press assets that support your releases.",
  },
  {
    question: "Do I need a paid plan to start?",
    answer: "No. The public-facing onboarding path starts with a free vault so artists can get organized before upgrading.",
  },
  {
    question: "Is my data private?",
    answer: "Yes. Vault content is private by default, with public visibility intended only for deliberate outputs like published press kit pages.",
  },
];

export default async function HomePage() {
  const session = await getSession();
  const signedIn = Boolean(session);
  const primaryHref = signedIn ? "/vault" : "/signup";

  return (
    <div className="marketing-shell">
      <SiteHeader signedIn={signedIn} />

      <main>
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="badge">Built for AI music artists, indie labels, and serious self-releasers</div>
              <h1>Your music catalog, rights, and press assets — all in one vault.</h1>
              <p>
                AIArtistVault gives artists one secure place to manage releases, metadata, writer details, registrations, and press kits without chasing spreadsheets or scattered files.
              </p>

              <div className="marketing-actions">
                <Link className="button button--primary" href={primaryHref}>
                  {signedIn ? "Open your vault" : "Create your free vault"}
                </Link>
                <Link className="button button--ghost" href="/#features">
                  Explore features
                </Link>
              </div>

              <div className="trust-line">No credit card required • Built for AI + indie artists</div>

              <div className="hero-stats">
                <div className="marketing-card stat-card">
                  <div className="eyebrow">Built for</div>
                  <strong>Artists who hate spreadsheet chaos</strong>
                </div>
                <div className="marketing-card stat-card">
                  <div className="eyebrow">Organize</div>
                  <strong>Catalog, metadata, and rights</strong>
                </div>
                <div className="marketing-card stat-card">
                  <div className="eyebrow">Publish</div>
                  <strong>Press-ready assets from one source</strong>
                </div>
              </div>
            </div>

            <div className="hero-visual marketing-card">
              <div className="hero-visual__glow" />
              <div className="dashboard-frame">
                <div className="dashboard-frame__header">
                  <span className="eyebrow">Release command center</span>
                  <span className="dashboard-pill">Private vault</span>
                </div>

                <div className="dashboard-frame__panel">
                  <div>
                    <div className="dashboard-label">Release</div>
                    <div className="dashboard-value">Echoes of Faded Kingdoms</div>
                  </div>
                  <div>
                    <div className="dashboard-label">Type</div>
                    <div className="dashboard-value">Album</div>
                  </div>
                  <div>
                    <div className="dashboard-label">Status</div>
                    <div className="dashboard-value">Metadata ready</div>
                  </div>
                </div>

                <div className="dashboard-columns">
                  <div className="dashboard-box">
                    <div className="dashboard-box__title">Rights tracker</div>
                    <ul>
                      <li>ISRC coverage: 11 of 12</li>
                      <li>Writers assigned: 12 of 12</li>
                      <li>ASCAP status: In progress</li>
                    </ul>
                  </div>

                  <div className="dashboard-box">
                    <div className="dashboard-box__title">Press kit preview</div>
                    <ul>
                      <li>Artist bio ready</li>
                      <li>Hero image linked</li>
                      <li>Release links synced</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-bar">
          <div className="container trust-bar__inner">
            <span>Trusted by artists releasing across Spotify, Apple Music, YouTube Music, TikTok, and more</span>
            <div className="trust-bar__logos">
              <span>Spotify</span>
              <span>Apple Music</span>
              <span>YouTube Music</span>
              <span>TikTok</span>
            </div>
          </div>
        </section>

        <section className="container marketing-section" id="features">
          <div className="section-heading">
            <div className="eyebrow">Core platform features</div>
            <h2>Everything you need to run release ops like a pro</h2>
            <p className="section-copy">
              Keep the music-business side of your releases organized with a workflow that feels built for artists, not corporate teams.
            </p>
          </div>

          <div className="marketing-grid">
            {pillars.map((item) => (
              <article className="marketing-card feature-card" key={item.title}>
                <div className="feature-card__icon" />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <Link className="inline-link" href={primaryHref}>Learn more</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="container marketing-section">
          <div className="section-heading">
            <div className="eyebrow">What you can manage inside the vault</div>
            <h2>Built to support the full release cycle</h2>
          </div>

          <div className="marketing-grid">
            {workflows.map((item, index) => (
              <article className="marketing-card workflow-card" key={item}>
                <div className="workflow-card__number">0{index + 1}</div>
                <h3>{item}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="container marketing-section" id="how-it-works">
          <div className="section-heading">
            <div className="eyebrow">How it works</div>
            <h2>From first setup to release day</h2>
          </div>

          <div className="timeline">
            {timeline.map((item, index) => (
              <div className="marketing-card timeline__item" key={item}>
                <div className="timeline__step">Step {index + 1}</div>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container marketing-section">
          <div className="section-heading">
            <div className="eyebrow">Pricing</div>
            <h2>Start free. Upgrade when your release workflow grows.</h2>
          </div>

          <div className="pricing-grid">
            <article className="pricing-card marketing-card">
              <div className="pricing-card__plan">Free</div>
              <div className="pricing-card__price">$0</div>
              <p className="section-copy">For solo artists getting organized</p>
              <ul className="feature-list">
                <li>1 artist vault</li>
                <li>Catalog tracking</li>
                <li>Basic press kit tools</li>
              </ul>
            </article>
            <article className="pricing-card pricing-card--featured marketing-card">
              <div className="pricing-card__plan">Pro</div>
              <div className="pricing-card__price">$19/mo</div>
              <p className="section-copy">For active self-releasers</p>
              <ul className="feature-list">
                <li>Unlimited releases</li>
                <li>Rights tracking</li>
                <li>Advanced press kit workflow</li>
              </ul>
            </article>
            <article className="pricing-card marketing-card">
              <div className="pricing-card__plan">Label</div>
              <div className="pricing-card__price">Contact us</div>
              <p className="section-copy">For managers and indie labels</p>
              <ul className="feature-list">
                <li>Roadmap for multi-artist workspaces</li>
                <li>Team workflow planning</li>
                <li>Migration support</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="container marketing-section">
          <div className="section-heading">
            <div className="eyebrow">FAQ</div>
            <h2>Common questions before you move your release workflow</h2>
          </div>

          <div className="faq-list">
            {faqs.map((item) => (
              <article className="marketing-card faq-card" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container marketing-section">
          <div className="cta-banner marketing-card">
            <div>
              <div className="eyebrow">Get started</div>
              <h2>Stop managing your music career across ten different tools</h2>
              <p className="section-copy">
                Create a vault for your catalog, rights, and press assets — and run your next release from one trusted source of truth.
              </p>
            </div>
            <div className="marketing-actions">
              <Link className="button button--primary" href={primaryHref}>
                {signedIn ? "Open your vault" : "Create your free vault"}
              </Link>
              <Link className="button button--ghost" href="/pricing">View pricing</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
