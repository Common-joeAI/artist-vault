"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { LoginFormState } from "@/app/login/actions";
import { loginAction } from "@/app/login/actions";
import styles from "./auth-form.module.css";

const initialState: LoginFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.button} type="submit" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);

  return (
    <div className={styles.panel}>
      <div className="badge">Artist vault access</div>
      <h1 className={styles.title}>Sign in to your vault</h1>
      <p className={styles.copy}>
        Access your catalog workspace, rights tracker, and press kit tools with the email and password tied to your AIArtistVault account.
      </p>

      <form action={action} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email address
          </label>
          <input className={styles.input} id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input className={styles.input} id="password" name="password" type="password" autoComplete="current-password" required />
        </div>

        {state.error ? <div className={styles.error}>{state.error}</div> : null}
        <SubmitButton />
      </form>

      <div className={styles.linkRow}>
        <span>Need an account?</span>
        <Link href="/signup">Create your free vault</Link>
      </div>

      <div className={styles.helper}>
        <strong>Still using the original self-hosted admin setup?</strong>
        <div className={styles.copy}>
          Environment-based admin credentials can still sign in here, so you can keep managing the existing vault while opening the public site to new users.
        </div>
      </div>
    </div>
  );
}
