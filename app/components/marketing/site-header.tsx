"use client";

import Link from "next/link";
import { useState } from "react";

type SiteHeaderProps = {
  signedIn?: boolean;
};

const navigation = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Resources" },
  { href: "/support", label: "Support" },
];

export function SiteHeader({ signedIn = false }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="site-brand" href="/">
          <span className="site-brand__mark">AV</span>
          <span>
            <span className="site-brand__name">AIArtistVault</span>
            <span className="site-brand__tag">Catalog, rights, and press assets in one secure vault</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          <Link className="button button--ghost" href={signedIn ? "/vault" : "/login"}>
            {signedIn ? "Open vault" : "Login"}
          </Link>
          <Link className="button button--primary" href={signedIn ? "/vault" : "/signup"}>
            {signedIn ? "Go to dashboard" : "Sign Up Free"}
          </Link>
          <button
            className="site-header__menu"
            type="button"
            aria-expanded={open}
            aria-label="Toggle navigation menu"
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={`mobile-nav ${open ? "is-open" : ""}`}>
        <div className="container mobile-nav__panel">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <div className="mobile-nav__actions">
            <Link className="button button--ghost" href={signedIn ? "/vault" : "/login"} onClick={() => setOpen(false)}>
              {signedIn ? "Open vault" : "Login"}
            </Link>
            <Link className="button button--primary" href={signedIn ? "/vault" : "/signup"} onClick={() => setOpen(false)}>
              {signedIn ? "Go to dashboard" : "Sign Up Free"}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
