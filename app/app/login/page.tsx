import { LoginForm } from "@/components/auth/login-form";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { redirectIfAuthenticated, getSession } from "@/lib/auth";

export default async function LoginPage() {
  await redirectIfAuthenticated();
  const session = await getSession();

  return (
    <div className="marketing-shell">
      <SiteHeader signedIn={Boolean(session)} />
      <main className="container marketing-page__content">
        <LoginForm />
      </main>
      <SiteFooter />
    </div>
  );
}
