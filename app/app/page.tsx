import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth";

// ── PATHOS: Speak to real artist pain ──────────────────────────────────────
const painPoints = [
  { icon: "📂", text: "Release notes buried in 6 different Google Docs" },
  { icon: "🔢", text: "ISRCs in a spreadsheet nobody can find" },
  { icon: "📧", text: "Press kit rebuilt from scratch for every pitch" },
  { icon: "😤", text: "DSP links scattered across DMs and a notes app" },
];

// ── LOGOS: Feature proof with specifics ───────────────────────────────────
const pillars = [
  {
    icon: "🎛️",
    title: "Release Command Center",
    body: "One workspace for every single, EP, and album — cover art, release date, DSP links, rollout notes, and track metadata. Nothing falls through the cracks.",
    proof: "Replaces 4–6 scattered tools",
  },
  {
    icon: "⚖️",
    title: "Rights & Registrations",
    body: "Track ISRCs, lyrics, writer splits, and PRO registration status (ASCAP/BMI) across every track — so you own what you created and can prove it.",
    proof: "Built-in ISRC + split tracking",
  },
  {
    icon: "🗂️",
    title: "Press Kit Engine",
    body: "Your artist bio, release data, and hero images sync into a clean, shareable press kit — no copy-paste, no rebuilding from scratch every time you pitch.",
    proof: "One source → infinite pitches",
  },
];

// ── LOGOS: Detailed how-it-works steps ────────────────────────────────────
const timeline = [
  { step: "01", title: "Create your vault", detail: "Sign up free. Your vault is private by default — no public profile until you're ready." },
  { step: "02", title: "Build your artist profile", detail: "Add your bio, links, and streaming profiles once. Everything else inherits from here." },
  { step: "03", title: "Add your catalog", detail: "Import from DistroKid or SoundOn, or build release records from scratch — tracks, metadata, art, all of it." },
  { step: "04", title: "Lock down your rights", detail: "Assign ISRCs, writers, splits, and PRO status per track. Know exactly where every right stands." },
  { step: "05", title: "Launch with confidence", detail: "Generate your press kit and go. Your next release ships with everything already in order." },
];

// ── ETHOS: Credibility proof points ───────────────────────────────────────
const proofPoints = [
  { stat: "100%", label: "Private by default", sub: "Your vault, your control" },
  { stat: "5 min", label: "To your first release record", sub: "Import or build from scratch" },
  { stat: "Zero", label: "Spreadsheets required", sub: "We killed the chaos" },
];

const faqs = [
  {
    question: "Is this only for AI-generated music?",
    answer: "No — it's for anyone making music independently. AI artists, bedroom producers, indie self-releasers, small labels. If you're releasing music without a major label ops team, this is for you.",
  },
  {
    question: "Will this replace my distributor?",
    answer: "No, and it's not trying to. It makes your distributor work better by keeping your metadata, rights, and assets organized before you ever upload. Think of it as the layer that sits above distribution.",
  },
  {
    question: "Do I need a paid plan to start?",
    answer: "Nope. Free vault gets you in the door — catalog tracking, one artist profile, basic press kit tools. Upgrade when you're ready for more.",
  },
  {
    question: "Is my music data private?",
    answer: "Yes. Everything in your vault is private by default. The only things that go public are what you deliberately publish — like a shared press kit page.",
  },
  {
    question: "Can I import my existing releases?",
    answer: "Yes. We support direct imports from DistroKid and SoundOn, with more importers on the way. Your existing catalog can be in your vault in minutes.",
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

        {/* ── HERO — Pathos lead, Logos support ── */}
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="badge">✦ Built for AI artists, indie labels &amp; serious self-releasers</div>

              <h1>Your music deserves better than a folder of spreadsheets.</h1>

              <p>
                You spend everything on the music. Your rights, metadata, and press assets
                deserve the same care. AIArtistVault is the release operations hub built
                specifically for artists who do this themselves.
              </p>

              <div className="marketing-actions">
                <Link className="button button--primary" href={primaryHref}>
                  {signedIn ? "Open your vault" : "Claim your free vault"}
                </Link>
                <Link className="button button--ghost" href="/#how-it-works">
                  See how it works
                </Link>
              </div>

              <div className="trust-line">Free to start &nbsp;•&nbsp; No credit card &nbsp;•&nbsp; Private by default</div>

              <div className="hero-stats">
                {proofPoints.map((p) => (
                  <div className="marketing-card stat-card" key={p.label}>
                    <div className="stat-card__number">{p.stat}</div>
                    <strong>{p.label}</strong>
                    <div className="stat-card__sub">{p.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-visual marketing-card">
              <div className="hero-visual__glow" />
              <div className="dashboard-frame">
                <div className="dashboard-frame__header">
                  <span className="eyebrow">Release command center</span>
                  <span className="dashboard-pill">🔒 Private vault</span>
                </div>
                <div className="hero-waveform">
                  {[
                    {h:32,d:0.0},{h:52,d:0.1},{h:72,d:0.2},{h:44,d:0.05},
                    {h:88,d:0.3},{h:60,d:0.15},{h:96,d:0.25},{h:48,d:0.08},
                    {h:80,d:0.35},{h:56,d:0.12},{h:64,d:0.22},{h:40,d:0.07},
                    {h:76,d:0.28},{h:52,d:0.18},{h:84,d:0.32},{h:44,d:0.04},
                    {h:68,d:0.16},{h:92,d:0.26},{h:36,d:0.06},{h:72,d:0.2},
                  ].map((b, i) => (
                    <div
                      key={i}
                      className="hero-waveform__bar"
                      style={{
                        height: b.h + 'px',
                        '--dur': (0.8 + b.d * 2) + 's',
                        '--delay': b.d + 's',
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
                <div className="dashboard-frame__panel">
                  <div>
                    <div className="dashboard-label">Release</div>
                    <div className="dashboard-value">Echoes of Faded Kingdoms</div>
                  </div>
                  <div>
                    <div className="dashboard-label">Type</div>
                    <div className="dashboard-value">Album · 12 tracks</div>
                  </div>
                  <div>
                    <div className="dashboard-label">Status</div>
                    <div className="dashboard-value" style={{color:'#86efac'}}>✓ Release ready</div>
                  </div>
                </div>
                <div className="dashboard-columns">
                  <div className="dashboard-box">
                    <div className="dashboard-box__title">⚖️ Rights tracker</div>
                    <ul>
                      <li>ISRC: 12 / 12 ✓</li>
                      <li>Writers: all assigned</li>
                      <li>ASCAP: registered</li>
                    </ul>
                  </div>
                  <div className="dashboard-box">
                    <div className="dashboard-box__title">🗂️ Press kit</div>
                    <ul>
                      <li>Bio ready ✓</li>
                      <li>Hero image linked ✓</li>
                      <li>Links synced ✓</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PATHOS — The pain section ── */}
        <section className="container marketing-section">
          <div className="section-heading fade-up">
            <div className="eyebrow">Sound familiar?</div>
            <h2>You&apos;re releasing music. Your ops are a mess.</h2>
            <p className="section-copy">
              Most independent artists are running release operations across a dozen
              half-finished systems. It works — until it doesn&apos;t. A missed ISRC,
              an outdated bio sent to a playlist curator, rights you can&apos;t prove.
              Those mistakes cost you.
            </p>
          </div>

          <div className="pain-grid fade-up">
            {painPoints.map((p) => (
              <div className="pain-card marketing-card" key={p.text}>
                <span className="pain-card__icon">{p.icon}</span>
                <p>{p.text}</p>
              </div>
            ))}
          </div>

          <div className="pain-resolution fade-up">
            <div className="pain-resolution__inner">
              <span className="pain-resolution__arrow">↓</span>
              <p>One vault fixes all of it.</p>
            </div>
          </div>
        </section>

        <div className="glow-divider" />

        {/* ── LOGOS — Features with proof ── */}
        <section className="container marketing-section" id="features">
          <div className="section-heading fade-up">
            <div className="eyebrow">Core platform features</div>
            <h2>Everything your release ops actually need.</h2>
            <p className="section-copy">
              Built around how independent artists actually work — not how labels do it,
              not how spreadsheet evangelists think you should.
            </p>
          </div>

          <div className="marketing-grid">
            {pillars.map((item) => (
              <article className="marketing-card feature-card fade-up" key={item.title}>
                <div className="feature-card__emoji">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <div className="feature-proof">✦ {item.proof}</div>
                <Link className="inline-link" href={primaryHref}>Get started →</Link>
              </article>
            ))}
          </div>
        </section>

        <div className="glow-divider" />

        {/* ── LOGOS — How it works ── */}
        <section className="container marketing-section" id="how-it-works">
          <div className="section-heading fade-up">
            <div className="eyebrow">How it works</div>
            <h2>From chaos to confident in five steps.</h2>
            <p className="section-copy">
              No steep learning curve. No bloated onboarding. Just the setup that
              actually moves your release ops forward — in one session.
            </p>
          </div>

          <div className="steps-list">
            {timeline.map((item) => (
              <div className="marketing-card step-card fade-up" key={item.step}>
                <div className="step-card__number">{item.step}</div>
                <div className="step-card__body">
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="glow-divider" />

        {/* ── ETHOS — Trust & credibility ── */}
        <section className="container marketing-section">
          <div className="ethos-banner marketing-card fade-up">
            <div className="ethos-banner__left">
              <div className="eyebrow">Why trust AIArtistVault</div>
              <h2>Built by people who get the independent music grind.</h2>
              <p className="section-copy">
                We didn&apos;t build this for labels with full ops teams. We built it for the
                artist who is also their own manager, PR rep, and metadata coordinator.
                Every feature exists because an independent artist needed it.
              </p>
              <ul className="ethos-list">
                <li>✦ Private by default — your vault is yours alone</li>
                <li>✦ No lock-in — works alongside your existing distributor</li>
                <li>✦ Import-ready — DistroKid &amp; SoundOn support built in</li>
                <li>✦ Designed for AI artists, not just traditional musicians</li>
              </ul>
            </div>
            <div className="ethos-banner__right">
              <div className="ethos-stat-stack">
                <div className="ethos-stat">
                  <span className="ethos-stat__num">100%</span>
                  <span className="ethos-stat__label">Private by default</span>
                </div>
                <div className="ethos-stat">
                  <span className="ethos-stat__num">0</span>
                  <span className="ethos-stat__label">Vendor lock-in</span>
                </div>
                <div className="ethos-stat">
                  <span className="ethos-stat__num">Free</span>
                  <span className="ethos-stat__label">To start — always</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── LOGOS — Pricing ── */}
        <section className="container marketing-section" id="pricing">
          <div className="section-heading fade-up">
            <div className="eyebrow">Pricing</div>
            <h2>Start free. Scale when you&apos;re ready.</h2>
            <p className="section-copy">
              No paywalls on the features that matter most when you&apos;re just getting organized.
            </p>
          </div>

          <div className="pricing-grid">
            <article className="pricing-card marketing-card fade-up">
              <div className="pricing-card__plan">Free</div>
              <div className="pricing-card__price">$0</div>
              <p className="section-copy">Get organized. No strings.</p>
              <ul className="feature-list">
                <li>1 artist vault</li>
                <li>Catalog &amp; release tracking</li>
                <li>Basic press kit tools</li>
                <li>Artist profile &amp; links</li>
              </ul>
              <Link className="button button--ghost" style={{marginTop:'1.25rem',display:'block',textAlign:'center'}} href="/signup">Start free</Link>
            </article>
            <article className="pricing-card pricing-card--featured marketing-card fade-up">
              <div className="pricing-card__badge">Most popular</div>
              <div className="pricing-card__plan">Pro</div>
              <div className="pricing-card__price">$19<span style={{fontSize:'1rem',fontWeight:400}}>/mo</span></div>
              <p className="section-copy">For active self-releasers shipping regularly.</p>
              <ul className="feature-list">
                <li>Unlimited releases &amp; tracks</li>
                <li>Full rights &amp; ISRC tracking</li>
                <li>Advanced press kit workflow</li>
                <li>DistroKid &amp; SoundOn import</li>
                <li>Release-ready notifications</li>
              </ul>
              <Link className="button button--primary" style={{marginTop:'1.25rem',display:'block',textAlign:'center'}} href="/signup">Get Pro</Link>
            </article>
            <article className="pricing-card marketing-card fade-up">
              <div className="pricing-card__plan">Label</div>
              <div className="pricing-card__price">Custom</div>
              <p className="section-copy">Managing multiple artists or a roster.</p>
              <ul className="feature-list">
                <li>Multi-artist workspaces</li>
                <li>Team workflow tools</li>
                <li>Migration &amp; onboarding support</li>
                <li>Priority support</li>
              </ul>
              <Link className="button button--ghost" style={{marginTop:'1.25rem',display:'block',textAlign:'center'}} href="/support">Talk to us</Link>
            </article>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="container marketing-section">
          <div className="section-heading fade-up">
            <div className="eyebrow">FAQ</div>
            <h2>Questions we hear from artists like you.</h2>
          </div>

          <div className="faq-list">
            {faqs.map((item) => (
              <article className="marketing-card faq-card fade-up" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── PATHOS CTA — Emotional close ── */}
        <section className="container marketing-section">
          <div className="cta-banner marketing-card">
            <div>
              <div className="eyebrow">Your next release starts here</div>
              <h2>Stop letting the business side of music slow you down.</h2>
              <p className="section-copy">
                You make the music. We handle the chaos around it.
                Get your vault, your rights, and your press assets locked in — so your next
                release goes out with everything already in order.
              </p>
            </div>
            <div className="marketing-actions">
              <Link className="button button--primary" href={primaryHref}>
                {signedIn ? "Open your vault" : "Claim your free vault"}
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
