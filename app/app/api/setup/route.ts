import { createUserAccount } from "@/lib/auth";
import { isSetupComplete, isValidSetupToken } from "@/lib/setup";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  if (await isSetupComplete()) {
    return new Response("Setup already completed.", { status: 403 });
  }

  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const setupToken = String(form.get("setupToken") ?? "");

  if (!isValidSetupToken(setupToken)) {
    return new Response("Invalid setup token.", { status: 403 });
  }

  await createUserAccount(email, password);
  redirect("/login");
}
