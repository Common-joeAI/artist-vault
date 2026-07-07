"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signupAction, type SignupFormState } from "@/app/signup/actions";
import styles from "./auth-form.module.css";

const initialState: SignupFormState = {};

function SubmitButton({ role }: { role: string }) {
  const { pending } = useFormStatus();
  const label =
    role === "radio_station"
      ? "Create Radio Station Account"
      : "Create Your Free Vault";

  return (
    <button className={styles.button} type="submit" disabled={pending}>
      {pending ? "Creating account…" : label}
    </button>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signupAction, initialState);
  const [role, setRole] = useState<"artist" | "radio_station">("artist");

  return (
    <div className={styles.panel}>
      <div className="badge">Start free</div>
      <h1 className={styles.title}>Create your Artist Vault account</h1>
      <p className={styles.copy}>
        One platform to store masters, track distribution, manage rights, and
        connect with radio stations.
      </p>

      {/* Role picker */}
      <div className={roleStyles.picker}>
        <button
          type="button"
          className={`${roleStyles.option} ${role === "artist" ? roleStyles.active : ""}`}
          onClick={() => setRole("artist")}
        >
          <span className={roleStyles.icon}>🎤</span>
          <span className={roleStyles.label}>I'm an Artist</span>
          <span className={roleStyles.sub}>Store masters, manage releases, register PRO</span>
        </button>
        <button
          type="button"
          className={`${roleStyles.option} ${role === "radio_station" ? roleStyles.active : ""}`}
          onClick={() => setRole("radio_station")}
        >
          <span className={roleStyles.icon}>📻</span>
          <span className={roleStyles.label}>I'm a Radio Station</span>
          <span className={roleStyles.sub}>Discover new music, get press packs</span>
        </button>
      </div>

      <form action={action} className={styles.form}>
        <input type="hidden" name="role" value={role} />

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              {role === "radio_station" ? "Your name" : "Artist / stage name"}
            </label>
            <input
              className={styles.input}
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder={role === "radio_station" ? "Jane Smith" : "Common Joe"}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email address
            </label>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            className={styles.input}
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            className={styles.input}
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {state.error ? <div className={styles.error}>{state.error}</div> : null}

        <SubmitButton role={role} />
      </form>

      <p className={styles.note}>
        {role === "radio_station"
          ? "Free to join. Get notified when release-ready music matches your format."
          : "No credit card required. Your vault stays private by default."}
      </p>

      <div className={styles.linkRow}>
        <span>Already have an account?</span>
        <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}

// Inline role picker styles (avoids extra CSS file)
const roleStyles = {
  picker: "role-picker",
  option: "role-option",
  active: "role-option--active",
  icon: "role-icon",
  label: "role-label",
  sub: "role-sub",
} as const;

// These class names need to be in globals.css  -  see below
