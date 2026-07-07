"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./pro.module.css";

type ProOrg = "ASCAP" | "BMI" | "SESAC" | "NONE";

const PRO_INFO = {
  ASCAP: {
    name: "ASCAP",
    full: "American Society of Composers, Authors and Publishers",
    color: "#e8372b",
    registerUrl: "https://www.ascap.com/music-creators/join",
    artistProfileUrl: "https://www.ascap.com/Home/account/profile",
    idLabel: "ASCAP Member ID",
    idFormat: "7–9 digit number (e.g. 123456789)",
    idPattern: /^\d{7,9}$/,
    perks: [
      "Quarterly royalty payments",
      "Free public performance licenses for small venues",
      "ASCAP Connect portal for detailed earnings breakdown",
      "Discount on music industry tools & software",
    ],
  },
  BMI: {
    name: "BMI",
    full: "Broadcast Music, Inc.",
    color: "#0057a8",
    registerUrl: "https://www.bmi.com/creators",
    artistProfileUrl: "https://www.bmi.com/account",
    idLabel: "BMI Songwriter ID",
    idFormat: "9–11 digit number (e.g. 10000000001)",
    idPattern: /^\d{9,11}$/,
    perks: [
      "Free to join for songwriters",
      "Bi-annual royalty payments",
      "BMI Live for live performance royalty tracking",
      "International royalty collection via sub-publishing agreements",
    ],
  },
  SESAC: {
    name: "SESAC",
    full: "Society of European Stage Authors and Composers",
    color: "#1a1a2e",
    registerUrl: "https://www.sesac.com/join",
    artistProfileUrl: "https://www.sesac.com/account",
    idLabel: "SESAC Affiliate ID",
    idFormat: "Alphanumeric (e.g. SES-123456)",
    idPattern: /^[A-Za-z0-9-]{4,20}$/,
    perks: [
      "Invite-only — selective for higher-earning writers",
      "Faster quarterly payments",
      "Personal licensing representative",
      "Higher royalty rates for qualified members",
    ],
  },
  NONE: {
    name: "Skip for now",
    full: "I'll set this up later",
    color: "#555",
    registerUrl: "",
    artistProfileUrl: "",
    idLabel: "",
    idFormat: "",
    idPattern: null,
    perks: [
      "You can add your PRO info any time from your profile settings",
      "Without PRO registration your public performances won't generate royalties",
    ],
  },
};

type Step = "choose" | "guide" | "ids" | "done";

export default function ProOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<ProOrg | null>(null);
  const [alreadyMember, setAlreadyMember] = useState<boolean | null>(null);

  // IDs
  const [writerId, setWriterId] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [ipiNumber, setIpiNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pro = selected ? PRO_INFO[selected] : null;

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile/pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proOrg: selected,
          writerId: writerId.trim() || null,
          publisherId: publisherId.trim() || null,
          ipiNumber: ipiNumber.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStep("done");
    } catch (e: any) {
      setError(e.message ?? "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── STEP 1: Choose PRO ──────────────────────────────────────────────────
  if (step === "choose") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.badge}>PRO Setup</div>
          <h1 className={styles.title}>Choose Your PRO</h1>
          <p className={styles.subtitle}>
            A <strong>Performing Rights Organization (PRO)</strong> collects royalties when your
            music is played publicly — radio, TV, streaming, live venues. You can only belong to{" "}
            <strong>one US PRO</strong> at a time.
          </p>

          <div className={styles.proGrid}>
            {(["ASCAP", "BMI", "SESAC"] as ProOrg[]).map((org) => {
              const info = PRO_INFO[org];
              const isSelected = selected === org;
              return (
                <button
                  key={org}
                  className={`${styles.proCard} ${isSelected ? styles.proCardSelected : ""}`}
                  style={{ borderColor: isSelected ? info.color : undefined }}
                  onClick={() => setSelected(org)}
                >
                  <span className={styles.proName} style={{ color: info.color }}>
                    {info.name}
                  </span>
                  <span className={styles.proFull}>{info.full}</span>
                  <ul className={styles.perks}>
                    {info.perks.map((p) => (
                      <li key={p}>✓ {p}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className={styles.actions}>
            <button
              className={styles.btnPrimary}
              disabled={!selected}
              onClick={() => setStep("guide")}
            >
              Continue with {selected ?? "…"}
            </button>
            <button
              className={styles.btnGhost}
              onClick={() => {
                setSelected("NONE");
                setStep("done");
              }}
            >
              Skip — I'll do this later
            </button>
          </div>

          <p className={styles.note}>
            💡 <strong>ASCAP vs BMI:</strong> Both are free to join and collect the same royalties.
            BMI has no joining fee for songwriters. ASCAP charges a one-time $50 fee. SESAC is
            invite-only. Most AI artists go with BMI or ASCAP — pick whichever your collaborators use.
          </p>
        </div>
      </div>
    );
  }

  // ── STEP 2: Guide through registration ──────────────────────────────────
  if (step === "guide" && pro && selected !== "NONE") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.badge} style={{ background: pro.color }}>
            {pro.name}
          </div>
          <h1 className={styles.title}>Are you already a {pro.name} member?</h1>

          <div className={styles.choiceRow}>
            <button
              className={`${styles.choiceBtn} ${alreadyMember === true ? styles.choiceBtnActive : ""}`}
              onClick={() => setAlreadyMember(true)}
            >
              ✅ Yes, I'm already a member
            </button>
            <button
              className={`${styles.choiceBtn} ${alreadyMember === false ? styles.choiceBtnActive : ""}`}
              onClick={() => setAlreadyMember(false)}
            >
              🆕 No, I need to join
            </button>
          </div>

          {alreadyMember === false && (
            <div className={styles.guideBox}>
              <h2>How to Join {pro.name}</h2>
              <ol className={styles.stepList}>
                <li>
                  Click the button below to open {pro.name}'s registration page in a new tab.
                </li>
                <li>
                  Register as a <strong>Songwriter / Composer</strong>. Use your legal name (not
                  your artist name) — the one you'll use on copyright registrations.
                </li>
                <li>
                  If you also publish your own music, register a <strong>Publishing entity</strong>{" "}
                  too (e.g. "Common Joe Music" or "[Your Name] Publishing").
                </li>
                <li>
                  After registering, {pro.name} will give you a <strong>{pro.idLabel}</strong>. Come
                  back here and enter it below.
                </li>
              </ol>
              <a
                href={pro.registerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalBtn}
                style={{ background: pro.color }}
              >
                Join {pro.name} →
              </a>
            </div>
          )}

          {alreadyMember === true && (
            <div className={styles.guideBox}>
              <h2>Find Your {pro.name} IDs</h2>
              <ol className={styles.stepList}>
                <li>
                  Log in to your{" "}
                  <a href={pro.artistProfileUrl} target="_blank" rel="noopener noreferrer">
                    {pro.name} account
                  </a>
                  .
                </li>
                <li>
                  Go to your <strong>Profile</strong> or <strong>Account</strong> section.
                </li>
                <li>
                  Copy your <strong>{pro.idLabel}</strong>
                  {selected === "ASCAP" ? " and your Publisher CAE/IPI number if you have a publishing entity" : ""}.
                </li>
              </ol>
              <a
                href={pro.artistProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalBtn}
                style={{ background: pro.color }}
              >
                Open {pro.name} Account →
              </a>
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.btnPrimary}
              disabled={alreadyMember === null}
              onClick={() => setStep("ids")}
            >
              I have my IDs — enter them now
            </button>
            <button className={styles.btnGhost} onClick={() => setStep("choose")}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 3: Enter IDs ───────────────────────────────────────────────────
  if (step === "ids" && pro && selected !== "NONE") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.badge} style={{ background: pro.color }}>
            {pro.name}
          </div>
          <h1 className={styles.title}>Enter Your {pro.name} IDs</h1>
          <p className={styles.subtitle}>
            These IDs link your releases to your {pro.name} account so royalties route correctly.
            You can update them any time from your profile settings.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label}>{pro.idLabel} (Songwriter)</label>
            <input
              className={styles.input}
              type="text"
              placeholder={pro.idFormat}
              value={writerId}
              onChange={(e) => setWriterId(e.target.value)}
            />
            <span className={styles.hint}>Format: {pro.idFormat}</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Publisher {pro.idLabel} <span className={styles.optional}>(optional)</span></label>
            <input
              className={styles.input}
              type="text"
              placeholder="If you have a self-publishing entity"
              value={publisherId}
              onChange={(e) => setPublisherId(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>IPI / CAE Number <span className={styles.optional}>(optional)</span></label>
            <input
              className={styles.input}
              type="text"
              placeholder="11-digit IPI number (e.g. 00000000000)"
              value={ipiNumber}
              onChange={(e) => setIpiNumber(e.target.value)}
            />
            <span className={styles.hint}>
              Your IPI is a universal identifier used internationally. Find it in your {pro.name} profile.
            </span>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save & Continue →"}
            </button>
            <button className={styles.btnGhost} onClick={() => setStep("guide")}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 4: Done ────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.successIcon}>🎉</div>
        <h1 className={styles.title}>
          {selected === "NONE" ? "PRO Setup Skipped" : `${pro?.name} Connected!`}
        </h1>
        <p className={styles.subtitle}>
          {selected === "NONE"
            ? "You can add your PRO information any time from your profile settings. Don't forget — unregistered performances won't generate royalties."
            : `Your ${pro?.name} IDs are saved. When you register works with ${pro?.name}, your releases in AI Artist Vault will link to your royalty account automatically.`}
        </p>

        {selected !== "NONE" && (
          <div className={styles.nextSteps}>
            <h3>Next Steps</h3>
            <ul>
              <li>Register each of your songs individually with {pro?.name} using their work registration portal</li>
              <li>Add co-writer splits if you collaborated on tracks</li>
              <li>Enable "Release Ready" on your releases to connect with radio stations</li>
            </ul>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => router.push("/vault")}
          >
            Go to My Vault →
          </button>
        </div>
      </div>
    </div>
  );
}
