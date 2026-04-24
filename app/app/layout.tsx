import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "AIArtistVault — Release Ops, Rights & Press Kit Vault for AI Music Artists",
    template: "%s · AIArtistVault",
  },
  description:
    "AIArtistVault helps AI music artists, indie artists, and small labels manage catalog metadata, rights tracking, and press kits from one secure vault.",
  openGraph: {
    title: "AIArtistVault",
    description:
      "Release ops, rights tracking, and press kit generation for AI music artists and serious indie self-releasers.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIArtistVault",
    description:
      "Release ops, rights tracking, and press kit generation for AI music artists and serious indie self-releasers.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
