"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signupAction, type SignupFormState } from "@/app/signup/actions";
import styles from "./auth-form.module.css";

const initialState: SignupFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.button} type="submit" disabled={pending}>
      {pending ? "Creating vault…" : "Create your free vault"}
    </button>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signupAction, initialState);

  return (
    <div className={styles.panel}>
      <div className="badge">Start free</div>
      <h1 className={styles.title}>Create your AIArtistVault account</h1>
      <p className={styles.copy}>
        Start with a secure account, then move straight into onboarding to add your artist profile, first release, and rights details.
      </p>

      <form action={action} className={styles.form}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Your name
            </label>
            <input className={styles.input} id="name" name="name" type="text" autoComplete="name" placeholder="Common Joe" />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email address
            </label>
            <input className={styles.input} id="email" name="email" type="email" autoComplete="email" required />
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
        <SubmitButton />
      </form>

      <p className={styles.note}>No credit card required. Your vault stays private by default.</p>

      <div className={styles.linkRow}>
        <span>Already have an account?</span>
        <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
