import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const { to } = await req.json();
    if (!to) return NextResponse.json({ error: "Email required" }, { status: 400 });
    const { error } = await resend.emails.send({
      from: "AI Artist Vault <noreply@aiartistvault.com>",
      to,
      subject: "AI Artist Vault — Email Test ✅",
      html: "<p style='font-family:sans-serif;padding:24px;'>✅ Email is working! Your press kit emails will send from <strong>noreply@aiartistvault.com</strong>.</p>",
      text: "Email is working! Press kit emails will send from noreply@aiartistvault.com",
    });
    if (error) throw new Error((error as any).message);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
