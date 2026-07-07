import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "AI Artist Vault <noreply@aiartistvault.com>";

export interface PressKitEmailOptions {
  to: string;
  artistName: string;
  subject?: string;
  htmlBody: string;
  textBody: string;
}

export async function sendPressKitEmail(opts: PressKitEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject ?? `Press Kit — ${opts.artistName}`,
    html: opts.htmlBody,
    text: opts.textBody,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function sendTestEmail(to: string) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "AI Artist Vault — Email Test",
    html: "<p>✅ Email is working! Your press kit emails will send from this address.</p>",
    text: "Email is working! Your press kit emails will send from this address.",
  });
  if (error) throw new Error(error.message);
  return data;
}
