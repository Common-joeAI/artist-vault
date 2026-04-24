import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <div className="site-footer__brand">AIArtistVault</div>
          <p className="site-footer__copy">
            Release ops, rights tracking, and press kit generation for AI music artists, serious self-releasers, and indie labels.
          </p>
        </div>

        <div>
          <div className="site-footer__heading">Product</div>
          <div className="site-footer__links">
            <Link href="/#features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/support">Support</Link>
          </div>
        </div>

        <div>
          <div className="site-footer__heading">Resources</div>
          <div className="site-footer__links">
            <Link href="/resources">Resources</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>

        <div>
          <div className="site-footer__heading">Follow</div>
          <div className="site-footer__links">
            <a href="https://x.com" target="_blank" rel="noreferrer">X</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer">TikTok</a>
            <a href="https://discord.com" target="_blank" rel="noreferrer">Discord</a>
          </div>
        </div>
      </div>

      <div className="container site-footer__bottom">© 2026 AIArtistVault. All rights reserved.</div>
    </footer>
  );
}
