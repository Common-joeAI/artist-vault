import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { RadioProfileForm } from "@/components/radio/radio-profile-form";

export const metadata = {
  title: "Complete Your Radio Profile  -  Artist Vault",
};

export default async function RadioProfilePage() {
  const session = await requireSession();

  if (session.role !== "radio_station" && session.role !== "admin") {
    redirect("/vault");
  }

  return (
    <div className="marketing-shell" style={{ minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div className="badge" style={{ marginBottom: "1rem" }}>Step 2 of 2</div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          📻 Set up your radio station profile
        </h1>
        <p style={{ color: "#aab3c2", marginBottom: "2rem" }}>
          Tell us about your station so artists know who you are  -  and so we can
          match you with music that fits your format.
        </p>
        <RadioProfileForm userId={session.userId} />
      </div>
    </div>
  );
}
