import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession, redirectIfAuthenticated } from "@/lib/auth";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Sign Up  -  Artist Vault",
};

export default async function SignupPage() {
  await redirectIfAuthenticated();
  const session = await getSession();

  return (
    <div className="marketing-shell">
      <SiteHeader signedIn={Boolean(session)} />
      <main className="container marketing-page__content">
        <SignupForm />
      </main>
      <SiteFooter />
    </div>
  );
}
