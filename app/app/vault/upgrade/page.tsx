'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function UpgradePage() {
  const params = useSearchParams();
  const success = params.get("success");
  const canceled = params.get("canceled");
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isPaid, setIsPaid] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/stripe/status").then(r => r.json()).then(d => setIsPaid(d.isPaid ?? false));
  }, [success]);

  async function handleUpgrade() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { alert(data.error ?? "Something went wrong"); setLoading(false); }
  }

  async function handlePortal() {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { alert(data.error ?? "Something went wrong"); setPortalLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0d1117 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 900, width: "100%" }}>

        {/* Banner messages */}
        {success && (
          <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid #10b981", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "2rem", color: "#10b981", textAlign: "center", fontSize: 16 }}>
            🎉 You're now an AI Artist Vault Pro member! Unlimited profiles unlocked.
          </div>
        )}
        {canceled && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "2rem", color: "#ef4444", textAlign: "center", fontSize: 16 }}>
            Payment canceled — no charges were made.
          </div>
        )}

        <h1 style={{ textAlign: "center", fontSize: 42, fontWeight: 800, color: "#fff", marginBottom: "0.5rem" }}>
          AI Artist Vault <span style={{ color: "#a855f7" }}>Pro</span>
        </h1>
        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 18, marginBottom: "3rem" }}>
          One plan. Everything unlocked.
        </p>

        {/* Plan comparison */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "3rem" }}>

          {/* Free */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "2rem" }}>
            <div style={{ color: "#9ca3af", fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: "0.75rem" }}>Free</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: "1.5rem" }}>$0</div>
            {[
              "1 artist profile",
              "Vault storage",
              "DistroKid TSV import",
              "Meta Enhancer",
              "PRO registration guidance",
              "Press Kit (1 kit)",
            ].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.75rem", color: "#d1d5db", fontSize: 15 }}>
                <span style={{ color: "#6b7280" }}>✓</span> {f}
              </div>
            ))}
          </div>

          {/* Pro */}
          <div style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))", border: "2px solid #a855f7", borderRadius: 16, padding: "2rem", position: "relative" }}>
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#a855f7", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 16px", borderRadius: 999, letterSpacing: 1 }}>MOST POPULAR</div>
            <div style={{ color: "#a855f7", fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: "0.75rem" }}>Pro</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: "0.25rem" }}>$19<span style={{ fontSize: 16, color: "#9ca3af" }}>/mo</span></div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: "1.5rem" }}>Cancel anytime</div>
            {[
              "Unlimited artist profiles",
              "Profile switcher in vault",
              "Everything in Free",
              "Priority AI processing",
              "Unlimited press kits",
              "Early access to new features",
            ].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.75rem", color: "#e9d5ff", fontSize: 15 }}>
                <span style={{ color: "#a855f7" }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          {isPaid ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid #10b981", borderRadius: 12, padding: "0.75rem 2rem", color: "#10b981", fontWeight: 600 }}>
                ✓ You're on the Pro plan
              </div>
              <button onClick={handlePortal} disabled={portalLoading}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#9ca3af", padding: "0.75rem 2rem", borderRadius: 10, cursor: "pointer", fontSize: 15 }}>
                {portalLoading ? "Loading..." : "Manage subscription →"}
              </button>
            </div>
          ) : (
            <button onClick={handleUpgrade} disabled={loading}
              style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", padding: "1rem 3rem", borderRadius: 12, fontSize: 18, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 0 30px rgba(168,85,247,0.4)" }}>
              {loading ? "Redirecting to Stripe..." : "Upgrade to Pro — $19/mo"}
            </button>
          )}
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: "1rem" }}>
            Secure payment via Stripe · Cancel anytime from your account
          </p>
        </div>
      </div>
    </div>
  );
}
