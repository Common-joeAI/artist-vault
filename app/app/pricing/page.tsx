import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth";

const plans = [
  {
    name: "Free",
    price: "$0",
    note: "For solo artists getting organized",
    features: ["1 artist vault", "Core catalog tracking", "Basic metadata storage", "Starter press kit"],
    cta: "Start free",
    href: "/signup",
  },
  {
    name: "Pro",
    price: "$19/mo",
    note: "For active self-releasers",
    features: ["Unlimited releases", "Rights tracking", "Advanced press kit tools", "Import workflows"],
    cta: "Get Pro",
    href: "/signup",
    featured: true,
  },
  {
    name: "Label",
    price: "Contact us",
    note: "For managers and indie labels",
    features: ["Multi-artist oversight", "Team access planning", "Shared workflows", "Migration support"],
    cta: "Talk to us",
    href: "/support",
  },
];

export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  const session = await getSession();

  return (
    <div className="marketing-shell">
      <SiteHeader signedIn={Boolean(session)} />
      <main className="container marketing-page__content">
        <section className="marketing-page__hero marketing-card">
          <div className="eyebrow">Pricing</div>
          <h1>Simple plans for growing catalogs</h1>
          <p>
            Start free, upgrade when your release workflow gets heavier, and move toward a label-ready operating system without rebuilding your metadata stack.
          </p>
        </section>

        <section className="pricing-grid marketing-section">
          {plans.map((plan) => (
            <article key={plan.name} className={`pricing-card marketing-card ${plan.featured ? "pricing-card--featured" : ""}`}>
              <div className="pricing-card__plan">{plan.name}</div>
              <div className="pricing-card__price">{plan.price}</div>
              <p className="section-copy">{plan.note}</p>
              <ul className="feature-list">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link className={`button ${plan.featured ? "button--primary" : "button--ghost"}`} href={plan.href}>
                {plan.cta}
              </Link>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
