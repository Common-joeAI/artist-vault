import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getPrimaryArtistProfile } from "@/lib/artist-vault";
import { db } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "AI Artist Vault <noreply@aiartistvault.com>";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { to, recipientName, note } = await req.json();

    if (!to || !to.includes("@")) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

    const artist = await getPrimaryArtistProfile(session.userId);
    if (!artist) return NextResponse.json({ error: "No artist profile" }, { status: 404 });

    const pk = await db.pressKit.findFirst({ where: { artistId: artist.id }, orderBy: { generatedAt: "desc" } });
    if (!pk) return NextResponse.json({ error: "Generate your press kit first" }, { status: 400 });

    const epkUrl = (pk as any).epkUrl ?? `https://aiartistvault.com/presskit/${(pk as any).slug}`;
    const streamingLinks: string[] = JSON.parse((pk as any).streamingLinks ?? "[]");
    const lyricsExcerpts: { title: string; excerpt: string }[] = JSON.parse((pk as any).lyricsExcerpts ?? "[]");
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";
    const noteBlock = note ? `<p style="margin:16px 0;font-style:italic;color:#555;">"${note}"</p>` : "";

    const lyricsHtml = lyricsExcerpts.length
      ? `<div style="margin:24px 0;"><h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#7c3aed;">Lyrics Excerpts</h3>${lyricsExcerpts.map(l => `<div style="margin-bottom:12px;"><strong>${l.title}</strong><pre style="font-family:serif;font-size:13px;color:#444;margin:4px 0;line-height:1.8;white-space:pre-wrap;">${l.excerpt}</pre></div>`).join("")}</div>`
      : "";
    const linksHtml = streamingLinks.length
      ? `<div style="margin:24px 0;"><h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#7c3aed;">Listen</h3>${streamingLinks.map(l => `<p style="margin:4px 0;font-size:14px;">${l}</p>`).join("")}</div>`
      : "";

    const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
<div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:32px;border-radius:16px;text-align:center;margin-bottom:24px;">
  ${(pk as any).photoUrl ? `<img src="${(pk as any).photoUrl}" alt="${artist.name}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;margin-bottom:16px;border:3px solid rgba(255,255,255,0.2);">` : ""}
  <h1 style="color:#fff;margin:0;font-size:28px;">${artist.name}</h1>
  <p style="color:#a78bfa;margin:8px 0 0;">AI Music Artist</p>
</div>
<p>${greeting}</p>${noteBlock}
<p style="line-height:1.7;color:#333;">${(pk as any).bio ?? ""}</p>
${lyricsHtml}${linksHtml}
<div style="margin:32px 0;text-align:center;">
  <a href="${epkUrl}" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;">View Full Press Kit →</a>
</div>
<p style="font-size:11px;color:#999;text-align:center;">Sent via AI Artist Vault · aiartistvault.com</p>
</body></html>`;

    const textBody = `${greeting}\n${note ? `\n"${note}"\n` : ""}\n${(pk as any).bio ?? ""}\n\n${lyricsExcerpts.map(l => `${l.title}:\n${l.excerpt}`).join("\n\n")}\n\nListen:\n${streamingLinks.join("\n")}\n\nFull Press Kit: ${epkUrl}`;

    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `Press Kit — ${artist.name}`,
      html: htmlBody,
      text: textBody,
    });
    if (error) throw new Error((error as any).message);

    return NextResponse.json({ ok: true, sentTo: to });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
