"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { AssetUrlPicker } from "@/components/uploads/asset-url-picker";
import { InlineAssetUpload } from "@/components/uploads/inline-asset-upload";
import styles from "./onboarding-wizard.module.css";

type WizardValues = {
  name: string;
  bio: string;
  photoUrl: string;
  spotifyUrl: string;
  appleMusicUrl: string;
  youtubeMusicUrl: string;
  websiteUrl: string;
  otherUrl: string;
};

type WizardProps = {
  defaultValues: WizardValues;
};

const steps = [
  {
    title: "Artist profile",
    description: "Set the canonical artist name, biography, and hero image URL for the vault.",
  },
  {
    title: "Artist links",
    description: "Store the public pages used for listeners, import flows, and press materials.",
  },
  {
    title: "Review",
    description: "Confirm your profile snapshot, then save the onboarding record.",
  },
];

export function OnboardingWizard({ defaultValues }: WizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveTargetRef = useRef<"vault" | "release">("vault");

  const { register, handleSubmit, watch } = useForm<WizardValues>({
    defaultValues,
  });

  const values = watch();

  const submit = handleSubmit(async (formValues) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to save onboarding details.");
        return;
      }

      setSuccess("Artist profile saved.");
      router.push(saveTargetRef.current === "release" ? "/vault/releases/new" : "/vault");
      router.refresh();
    } catch {
      setError("A network or server error occurred while saving onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className={styles.panel}>
      <div className={styles.steps}>
        {steps.map((step, index) => (
          <div className={`${styles.step} ${index === stepIndex ? styles.active : ""}`} key={step.title}>
            <strong>
              {index + 1}. {step.title}
            </strong>
            <div className={styles.muted}>{step.description}</div>
          </div>
        ))}
      </div>

      <form className={styles.form} onSubmit={submit}>
        {stepIndex === 0 ? (
          <>
            <div className={styles.columns2}>
              <div className={styles.field}>
                <label htmlFor="name">Artist name</label>
                <input id="name" {...register("name", { required: true })} placeholder="Common-Joe" />
              </div>
              <div className={styles.field}>
                <label htmlFor="photoUrl">Artist photo URL</label>
                <input id="photoUrl" {...register("photoUrl")} placeholder="https://..." />
              </div>
            </div>

            <InlineAssetUpload
              inputId="photoUrl"
              defaultCategory="press"
              title="Upload artist image here"
              helpText="Upload a portrait, press image, or hero shot during onboarding and the URL will be dropped into the field above automatically."
            />

            <AssetUrlPicker inputId="photoUrl" defaultCategory="press" label="Choose from uploaded artist or press images" />

            <div className={styles.field}>
              <label htmlFor="bio">Artist bio</label>
              <textarea id="bio" {...register("bio")} placeholder="Short artist bio, achievements, release style, and brand identity." />
            </div>

            <div className={styles.help}>
              <strong>Tip</strong>
              <div className={styles.muted}>
                You can upload the artist image right here, or reuse a file that already exists in the media library with the picker.
              </div>
            </div>
          </>
        ) : null}

        {stepIndex === 1 ? (
          <>
            <div className={styles.columns2}>
              <div className={styles.field}>
                <label htmlFor="spotifyUrl">Spotify artist URL</label>
                <input id="spotifyUrl" {...register("spotifyUrl")} placeholder="https://open.spotify.com/artist/..." />
              </div>
              <div className={styles.field}>
                <label htmlFor="appleMusicUrl">Apple Music artist URL</label>
                <input id="appleMusicUrl" {...register("appleMusicUrl")} placeholder="https://music.apple.com/..." />
              </div>
            </div>

            <div className={styles.columns2}>
              <div className={styles.field}>
                <label htmlFor="youtubeMusicUrl">YouTube / YouTube Music URL</label>
                <input id="youtubeMusicUrl" {...register("youtubeMusicUrl")} placeholder="https://music.youtube.com/..." />
              </div>
              <div className={styles.field}>
                <label htmlFor="websiteUrl">Website URL</label>
                <input id="websiteUrl" {...register("websiteUrl")} placeholder="https://yourartistsite.com" />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="otherUrl">Other public artist page</label>
              <input id="otherUrl" {...register("otherUrl")} placeholder="https://..." />
            </div>
          </>
        ) : null}

        {stepIndex === 2 ? (
          <div className={styles.summary}>
            <strong>Review before saving</strong>
            <div className={styles.muted}>Name: {values.name || "—"}</div>
            <div className={styles.muted}>Bio: {values.bio || "—"}</div>
            <div className={styles.muted}>Photo URL: {values.photoUrl || "—"}</div>
            <div className={styles.muted}>Spotify: {values.spotifyUrl || "—"}</div>
            <div className={styles.muted}>Apple Music: {values.appleMusicUrl || "—"}</div>
            <div className={styles.muted}>YouTube Music: {values.youtubeMusicUrl || "—"}</div>
            <div className={styles.muted}>Website: {values.websiteUrl || "—"}</div>
            <div className={styles.muted}>Other: {values.otherUrl || "—"}</div>
            <div className={styles.muted} style={{ marginTop: "0.75rem" }}>
              Save to the vault, or save and jump straight into adding the first release.
            </div>
          </div>
        ) : null}

        {error ? <div className={styles.error}>{error}</div> : null}
        {success ? <div className={styles.success}>{success}</div> : null}

        <div className={styles.buttons}>
          <button className={styles.buttonSecondary} type="button" onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>
            Back
          </button>

          {stepIndex < steps.length - 1 ? (
            <button className={styles.button} type="button" onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}>
              Continue
            </button>
          ) : (
            <div className={styles.submitRow}>
              <button
                className={styles.buttonSecondary}
                type="submit"
                disabled={isSubmitting}
                onClick={() => {
                  saveTargetRef.current = "release";
                }}
              >
                {isSubmitting && saveTargetRef.current === "release" ? "Saving…" : "Save & add release"}
              </button>
              <button className={styles.button} type="submit" disabled={isSubmitting} onClick={() => {
                saveTargetRef.current = "vault";
              }}>
                {isSubmitting && saveTargetRef.current === "vault" ? "Saving…" : "Save onboarding"}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
