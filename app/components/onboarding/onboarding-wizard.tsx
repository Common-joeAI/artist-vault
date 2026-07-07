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
  proOrg: "ASCAP" | "BMI" | "SESAC" | "";
  proMemberId?: string;
  producerIpiNumber?: string;
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
    title: "PRO Membership",
    description: "Select your Performance Rights Organization. You can only belong to one — choose ASCAP, BMI, or SESAC.",
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

  const { register, handleSubmit, watch, setValue } = useForm<WizardValues>({
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
        {/* Step 0 — Artist profile */}
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

        {/* Step 1 — Artist links */}
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

        {/* Step 2 — PRO Membership */}
        {stepIndex === 2 ? (
          <div className={styles.proStep}>
            <p className={styles.muted} style={{ marginBottom: "1rem" }}>
              Performance Rights Organizations (PROs) collect royalties when your music is played publicly — on radio, streaming, TV, and live venues.
              You can only be a member of <strong>one</strong> PRO. If you are already registered, select yours below. If not, you can sign up after completing onboarding.
            </p>

            <div className={styles.proCards}>
              {(["ASCAP", "BMI", "SESAC", ""] as const).map((org) => (
                <button
                  key={org || "none"}
                  type="button"
                  className={`${styles.proCard} ${values.proOrg === org ? styles.proCardActive : ""}`}
                  onClick={() => setValue("proOrg", org)}
                >
                  <strong>{org || "None / Not yet"}</strong>
                  <div className={styles.muted}>
                    {org === "ASCAP" && "American Society of Composers, Authors and Publishers"}
                    {org === "BMI" && "Broadcast Music, Inc."}
                    {org === "SESAC" && "Society of European Stage Authors and Composers"}
                    {org === "" && "Skip for now — you can update this later in PRO Registration."}
                  </div>
                </button>
              ))}
            </div>

            <input type="hidden" {...register("proOrg")} />

            {values.proOrg ? (
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className={styles.field}>
                  <label htmlFor="proMemberId">
                    {values.proOrg === "ASCAP" ? "ASCAP Member ID" : values.proOrg === "BMI" ? "BMI Member ID" : "SESAC Member ID"}
                    <span style={{ fontWeight: 400, color: "var(--muted, #888)", marginLeft: "0.4rem" }}>(required)</span>
                  </label>
                  <input
                    id="proMemberId"
                    {...register("proMemberId")}
                    placeholder={values.proOrg === "ASCAP" ? "e.g. 123456789" : values.proOrg === "SESAC" ? "e.g. 000123456" : "e.g. 987654321"}
                  />
                  <div className={styles.muted} style={{ marginTop: "0.25rem" }}>
                    {values.proOrg === "ASCAP" && (
                      <>Find yours at <a href="https://www.ascap.com/membership/joining-ascap" target="_blank" rel="noopener noreferrer">ascap.com</a> under your member account.</>
                    )}
                    {values.proOrg === "BMI" && (
                      <>Find yours at <a href="https://www.bmi.com/creators" target="_blank" rel="noopener noreferrer">bmi.com</a> in your publisher/creator portal.</>
                    )}
                    {values.proOrg === "SESAC" && (
                      <>Find yours at <a href="https://www.sesac.com" target="_blank" rel="noopener noreferrer">sesac.com</a> in your member portal.</>
                    )}
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="producerIpiNumber">
                    Producer IPI / CAE Number
                    <span style={{ fontWeight: 400, color: "var(--muted, #888)", marginLeft: "0.4rem" }}>(optional)</span>
                  </label>
                  <input
                    id="producerIpiNumber"
                    {...register("producerIpiNumber")}
                    placeholder="e.g. 00123456789"
                  />
                  <div className={styles.muted} style={{ marginTop: "0.25rem" }}>
                    Your IPI number identifies you as a music rights holder internationally. Used on track registrations.
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Step 3 — Review */}
        {stepIndex === 3 ? (
          <div className={styles.summary}>
            <strong>Review before saving</strong>
            <div className={styles.muted}>Name: {values.name || " - "}</div>
            <div className={styles.muted}>Bio: {values.bio || " - "}</div>
            <div className={styles.muted}>Photo URL: {values.photoUrl || " - "}</div>
            <div className={styles.muted}>Spotify: {values.spotifyUrl || " - "}</div>
            <div className={styles.muted}>Apple Music: {values.appleMusicUrl || " - "}</div>
            <div className={styles.muted}>YouTube Music: {values.youtubeMusicUrl || " - "}</div>
            <div className={styles.muted}>Website: {values.websiteUrl || " - "}</div>
            <div className={styles.muted}>Other: {values.otherUrl || " - "}</div>
            <div className={styles.muted}>PRO: {values.proOrg || "None selected"}</div>
            {values.proMemberId ? <div className={styles.muted}>Member ID: {values.proMemberId}</div> : null}
            {values.producerIpiNumber ? <div className={styles.muted}>Producer IPI: {values.producerIpiNumber}</div> : null}
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