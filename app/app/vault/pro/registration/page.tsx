import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import styles from "@/app/vault/ui.module.css";

export const dynamic = "force-dynamic";

export default async function ProRegistrationPage() {
  const session = await requireSession();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { proOrg: true, email: true },
  });

  const proOrg = user?.proOrg ?? null;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1rem", fontFamily: "inherit" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 6 }}>
          Rights Management
        </div>
        <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>🎼 PRO Registration</h1>
        <p style={{ color: "#9ca3af", marginTop: 8, marginBottom: 0, maxWidth: 620 }}>
          A Performance Rights Organization (PRO) collects royalties when your music is played publicly  -  on radio, streaming, TV, venues, and more.
          You must register with exactly one PRO. Once you pick one, you stay with them.
        </p>
      </div>

      {/* Current status */}
      {proOrg ? (
        <div style={{ background: "#7c3aed22", border: "1px solid #7c3aed66", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: "2rem" }}>✅</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>You are registered with {proOrg}</div>
            <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: 4 }}>
              Your PRO is locked in. Make sure all your tracks are registered in your {proOrg} account.
              {proOrg === "ASCAP" && " Log in at ascap.com → My Works to register individual tracks."}
              {proOrg === "BMI" && " Log in at bmi.com → My Catalog to register individual tracks."}
              {proOrg === "SESAC" && " Contact your SESAC rep to register individual tracks."}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "#f59e0b18", border: "1px solid #f59e0b55", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: "2rem" }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>You haven't selected a PRO yet</div>
            <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: 4 }}>
              Pick one below. You can only be with one PRO  -  this cannot be changed later without a formal resignation process.
            </div>
          </div>
        </div>
      )}

      {/* What is a PRO */}
      <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.02)" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem" }}>What does a PRO actually do?</h2>
        <ul style={{ color: "#d1d5db", fontSize: "0.9rem", lineHeight: 1.7, paddingLeft: "1.25rem", margin: 0 }}>
          <li>Collects <strong>performance royalties</strong> when your songs are played on radio, TV, streaming, live venues, or anywhere public</li>
          <li>Distributes those royalties directly to you as a songwriter/publisher</li>
          <li>You register your songs with them  -  they match plays to your catalog and pay you quarterly</li>
          <li>Free to join  -  membership pays for itself the first time a song gets airplay</li>
        </ul>
      </div>

      {/* PRO comparison cards */}
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1rem" }}>Compare the main PROs</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>

        {/* ASCAP */}
        <div style={{ border: proOrg === "ASCAP" ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1.25rem", background: proOrg === "ASCAP" ? "#3b82f618" : "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: "1.5rem" }}>🇺🇸</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem" }}>ASCAP</div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>American Society of Composers, Authors and Publishers</div>
            </div>
          </div>
          <ul style={{ color: "#d1d5db", fontSize: "0.82rem", lineHeight: 1.7, paddingLeft: "1.1rem", margin: "0 0 1rem" }}>
            <li>Member-owned nonprofit</li>
            <li>$50 one-time signup fee</li>
            <li>Pays quarterly</li>
            <li>Strong for indie & AI-created music</li>
            <li>Dashboard: <strong>ascap.com/members</strong></li>
          </ul>
          <a
            href="https://www.ascap.com/music-creators/join"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", background: "#3b82f6", color: "#fff", borderRadius: 10, padding: "9px 18px", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}
          >
            Join ASCAP →
          </a>
        </div>

        {/* BMI */}
        <div style={{ border: proOrg === "BMI" ? "2px solid #10b981" : "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1.25rem", background: proOrg === "BMI" ? "#10b98118" : "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: "1.5rem" }}>🎵</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem" }}>BMI</div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>Broadcast Music, Inc.</div>
            </div>
          </div>
          <ul style={{ color: "#d1d5db", fontSize: "0.82rem", lineHeight: 1.7, paddingLeft: "1.1rem", margin: "0 0 1rem" }}>
            <li>Free to join (no signup fee)</li>
            <li>Pays quarterly</li>
            <li>Largest US PRO by catalog size</li>
            <li>Good for all genres</li>
            <li>Dashboard: <strong>bmi.com/creators</strong></li>
          </ul>
          <a
            href="https://www.bmi.com/creators/join"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", background: "#10b981", color: "#fff", borderRadius: 10, padding: "9px 18px", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}
          >
            Join BMI →
          </a>
        </div>

        {/* SESAC */}
        <div style={{ border: proOrg === "SESAC" ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1.25rem", background: proOrg === "SESAC" ? "#f59e0b18" : "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: "1.5rem" }}>⭐</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem" }}>SESAC</div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>Society of European Stage Authors & Composers</div>
            </div>
          </div>
          <ul style={{ color: "#d1d5db", fontSize: "0.82rem", lineHeight: 1.7, paddingLeft: "1.1rem", margin: "0 0 1rem" }}>
            <li>Invite-only (must apply)</li>
            <li>Smaller, more selective roster</li>
            <li>Higher per-play rates for approved members</li>
            <li>Best if you already have significant airplay</li>
            <li>Dashboard: <strong>sesac.com</strong></li>
          </ul>
          <a
            href="https://www.sesac.com/affiliates/become-an-affiliate/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", background: "#f59e0b", color: "#fff", borderRadius: 10, padding: "9px 18px", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}
          >
            Apply to SESAC →
          </a>
        </div>
      </div>

      {/* Which one to pick */}
      <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.02)" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem" }}>Which one should I pick?</h2>
        <div style={{ color: "#d1d5db", fontSize: "0.9rem", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 0.75rem" }}>
            <strong>Just starting out?</strong> → Go with <strong>BMI</strong> (free) or <strong>ASCAP</strong> ($50 one-time). Both are excellent for AI music creators.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>
            <strong>Already getting radio plays or sync placements?</strong> → Consider applying to <strong>SESAC</strong> for potentially higher rates.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Important:</strong> You can only be a member of <em>one</em> PRO as a songwriter. Pick one and register all your works with them. You cannot collect from both ASCAP and BMI simultaneously.
          </p>
        </div>
      </div>

      {/* Steps after joining */}
      <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.02)" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem" }}>After you join  -  what to do next</h2>
        <ol style={{ color: "#d1d5db", fontSize: "0.9rem", lineHeight: 1.9, paddingLeft: "1.25rem", margin: 0 }}>
          <li>Log into your PRO dashboard and register each song (title, writers, ISRC)</li>
          <li>Come back here and update your PRO in <Link href="/vault/onboarding" style={{ color: "#7c3aed" }}>your profile settings</Link></li>
          <li>Use <Link href="/vault/rights" style={{ color: "#7c3aed" }}>Rights & Licensing</Link> to track registration status per track</li>
          <li>Make sure each release has an ISRC  -  your distributor assigns these</li>
        </ol>
      </div>

      {/* Already registered CTA */}
      {!proOrg && (
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "1.25rem 1.5rem", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Already a member of a PRO?</div>
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: "0 0 1rem" }}>
            If you've already joined ASCAP, BMI, or SESAC, update your profile so the vault can track your registration status per track.
          </p>
          <Link
            href="/vault/onboarding"
            style={{ display: "inline-block", background: "#7c3aed", color: "#fff", borderRadius: 10, padding: "9px 18px", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}
          >
            Update my PRO in profile →
          </Link>
        </div>
      )}
    </div>
  );
}
