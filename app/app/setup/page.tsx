import { notFound } from "next/navigation";
import { getSetupTokenRequirement, isSetupComplete } from "@/lib/setup";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if (await isSetupComplete()) {
    notFound();
  }

  const { required, token } = getSetupTokenRequirement();
  const params = await searchParams;
  const suppliedToken = params.token?.trim() ?? "";

  if (required && (!token || suppliedToken !== token)) {
    notFound();
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h1>Setup Artist Vault</h1>
      <p>Create the first owner account for this installation.</p>
      <form method="post" action="/api/setup" style={{ display: "grid", gap: "0.75rem" }}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" minLength={12} required />
        <input type="hidden" name="setupToken" value={suppliedToken} />
        <button type="submit">Create User</button>
      </form>
      {required ? <p style={{ marginTop: "1rem" }}>Production setup is protected by a one-time setup token.</p> : null}
    </div>
  );
}
