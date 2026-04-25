"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveRadioProfileAction, type RadioProfileState } from "@/app/radio/signup/actions";
import styles from "@/components/auth/auth-form.module.css";

const GENRES = [
  "Hip-Hop", "R&B", "Pop", "Rock", "Country", "Jazz", "Blues",
  "Electronic", "Classical", "Gospel", "Latin", "Folk", "Indie",
  "Metal", "Reggae", "Soul", "Funk", "Alternative", "Ambient",
];

const initialState: RadioProfileState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.button} type="submit" disabled={pending}>
      {pending ? "Saving profile…" : "Complete setup →"}
    </button>
  );
}

export function RadioProfileForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(saveRadioProfileAction, initialState);

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="userId" value={userId} />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="stationName">
          Station name *
        </label>
        <input
          className={styles.input}
          id="stationName"
          name="stationName"
          type="text"
          placeholder="KXYZ 98.7 FM"
          required
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contactName">
            Music director / contact name
          </label>
          <input
            className={styles.input}
            id="contactName"
            name="contactName"
            type="text"
            placeholder="Jane Smith"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="contactEmail">
            Contact email for new music submissions
          </label>
          <input
            className={styles.input}
            id="contactEmail"
            name="contactEmail"
            type="email"
            placeholder="music@kxyz.com"
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="city">
            City
          </label>
          <input className={styles.input} id="city" name="city" type="text" placeholder="Phoenix" />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="state">
            State
          </label>
          <input className={styles.input} id="state" name="state" type="text" placeholder="AZ" maxLength={2} />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="website">
          Station website
        </label>
        <input
          className={styles.input}
          id="website"
          name="website"
          type="url"
          placeholder="https://kxyz.com"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          Music formats you play (select all that apply)
        </label>
        <div className="genre-grid">
          {GENRES.map((genre) => (
            <label key={genre} className="genre-chip">
              <input type="checkbox" name="genres" value={genre.toLowerCase()} />
              <span>{genre}</span>
            </label>
          ))}
        </div>
        <p style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "0.5rem" }}>
          We'll only notify you about releases that match your selected formats.
        </p>
      </div>

      <div className={styles.field}>
        <label className="checkbox-label">
          <input type="checkbox" name="notifyOnRelease" value="true" defaultChecked />
          <span>
            Notify me by email when release-ready music matches my format
          </span>
        </label>
      </div>

      {state.error ? <div className={styles.error}>{state.error}</div> : null}

      <SubmitButton />
    </form>
  );
}
