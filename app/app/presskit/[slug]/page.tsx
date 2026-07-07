import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function PublicPressKitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const pk = await db.pressKit.findFirst({ where: { slug, isPublic: true } });
  if (!pk) notFound();

  const artist = await db.artistProfile.findUnique({ where: { id: (pk as any).artistId }, include: { links: true } });
  if (!artist) notFound();

  const lyricsExcerpts: { title: string; excerpt: string }[] = JSON.parse((pk as any).lyricsExcerpts ?? "[]");
  const streamingLinks: string[] = JSON.parse((pk as any).streamingLinks ?? "[]");

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{artist.name as string} — Press Kit</title>
        <meta name="description" content={`Official press kit for ${artist.name}`} />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0f0f1a; color: #e5e7eb; font-family: system-ui, sans-serif; }
          .hero { background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 60px 24px; text-align: center; }
          .hero img { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid rgba(255,255,255,0.2); margin-bottom: 20px; }
          .hero h1 { font-size: 2.5rem; font-weight: 900; color: #fff; }
          .hero p { color: #a78bfa; margin-top: 8px; font-size: 1rem; }
          .container { max-width: 760px; margin: 0 auto; padding: 40px 24px; }
          .section { margin-bottom: 40px; }
          .section-title { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #7c3aed; margin-bottom: 16px; }
          .bio { font-size: 1rem; line-height: 1.8; color: #d1d5db; }
          .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px; margin-bottom: 12px; }
          .card strong { display: block; font-size: 0.95rem; margin-bottom: 8px; color: #fff; }
          .card pre { font-family: Georgia, serif; font-size: 0.9rem; color: #9ca3af; line-height: 1.9; white-space: pre-wrap; }
          .links a { display: inline-block; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); border-radius: 8px; padding: 8px 16px; margin: 4px; color: #a78bfa; text-decoration: none; font-size: 0.9rem; }
          .links a:hover { background: rgba(124,58,237,0.3); }
          .footer { text-align: center; color: #4b5563; font-size: 0.8rem; padding: 40px 24px; }
        `}</style>
      </head>
      <body>
        <div className="hero">
          {(artist.photoUrl as string) && <img src={artist.photoUrl as string} alt={artist.name as string} />}
          <h1>{artist.name as string}</h1>
          <p>AI Music Artist{(pk as any).proOrg ? ` · ${(pk as any).proOrg}` : ""}</p>
        </div>

        <div className="container">
          <div className="section">
            <div className="section-title">Biography</div>
            <p className="bio">{(pk as any).bio}</p>
          </div>

          {lyricsExcerpts.length > 0 && (
            <div className="section">
              <div className="section-title">Lyrics Excerpts</div>
              {lyricsExcerpts.map((l, i) => (
                <div className="card" key={i}>
                  <strong>{l.title}</strong>
                  <pre>{l.excerpt}</pre>
                </div>
              ))}
            </div>
          )}

          {streamingLinks.length > 0 && (
            <div className="section">
              <div className="section-title">Listen</div>
              <div className="links">
                {streamingLinks.map((l, i) => {
                  const [label, url] = l.split(": ");
                  return url ? <a key={i} href={url} target="_blank" rel="noreferrer">{label}</a> : <span key={i}>{l}</span>;
                })}
              </div>
            </div>
          )}
        </div>

        <div className="footer">Press Kit powered by AI Artist Vault · aiartistvault.com</div>
      </body>
    </html>
  );
}
