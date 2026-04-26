import { db } from '@/lib/db';
import { notFound } from 'next/navigation';

function parseJson<T>(s: string | null | undefined): T[] {
  if (!s) return [];
  try { return JSON.parse(s); } catch { return []; }
}

const TOOL_EMOJI: Record<string,string> = { suno:'🎵', udio:'🎶', musicfy:'🎤', aimusicgen:'🤖', loudly:'🔊', beatoven:'🥁', boomy:'💥', other:'✨' };
const ENERGY_COLOR: Record<string,string> = { low:'#60a5fa', medium:'#34d399', high:'#f87171' };

export default async function ArtistPublicPage({ params }: { params: { slug: string } }) {
  const artist = await db.artistProfile.findUnique({ where: { slug: params.slug }, include: { links: true } });
  if (!artist || !artist.isPublic) notFound();

  const dna = await db.styleDna.findUnique({ where: { artistId: artist.id } });
  const releases = await db.release.findMany({ where: { artistId: artist.id, isReleaseReady: true }, orderBy: { releaseDate: 'desc' }, take: 10 });

  const genres = parseJson<string>(dna?.topGenres);
  const moods = parseJson<string>(dna?.topMoods);
  const tools = parseJson<string>(dna?.topTools);
  const soundsLike = parseJson<string>(dna?.soundsLike);
  const tags = parseJson<string>(dna?.tags);

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      {/* Hero */}
      <div style={{ background:'linear-gradient(180deg,rgba(124,58,237,0.15) 0%,transparent 100%)', padding:'4rem 1rem 2rem', textAlign:'center' }}>
        {artist.photoUrl && <img src={artist.photoUrl} alt={artist.name} style={{ width:100, height:100, borderRadius:'50%', objectFit:'cover', border:'3px solid #7c3aed', marginBottom:16 }} />}
        <h1 style={{ fontSize:'2.2rem', fontWeight:900, margin:'0 0 8px' }}>{artist.name}</h1>
        {artist.location && <div style={{ color:'#9ca3af', marginBottom:8 }}>📍 {artist.location}</div>}
        {artist.bio && <p style={{ maxWidth:560, margin:'0 auto 16px', color:'#d1d5db', lineHeight:1.7 }}>{artist.bio}</p>}
        {dna?.energyProfile && (
          <span style={{ background: (ENERGY_COLOR[dna.energyProfile]||'#9ca3af')+'22', color: ENERGY_COLOR[dna.energyProfile]||'#9ca3af', borderRadius:20, padding:'4px 16px', fontWeight:700, fontSize:'0.85rem' }}>
            ⚡ {dna.energyProfile} energy
          </span>
        )}
      </div>

      <div style={{ maxWidth:820, margin:'0 auto', padding:'0 1rem 4rem' }}>
        {/* Style DNA */}
        {dna && (
          <div style={{ border:'1px solid rgba(124,58,237,0.3)', borderRadius:16, padding:'1.5rem', background:'rgba(124,58,237,0.05)', marginBottom:'1.5rem' }}>
            <div style={{ fontWeight:800, fontSize:'1.1rem', marginBottom:12 }}>🧬 Style DNA</div>
            {dna.summary && <p style={{ color:'#d1d5db', lineHeight:1.7, marginBottom:16 }}>{dna.summary}</p>}
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
              {genres.map(g => <span key={g} style={{ background:'#7c3aed22', color:'#a78bfa', borderRadius:20, padding:'3px 12px', fontSize:'0.8rem', fontWeight:700 }}>{g}</span>)}
              {moods.map(m => <span key={m} style={{ background:'#fb923c22', color:'#fb923c', borderRadius:20, padding:'3px 12px', fontSize:'0.8rem', fontWeight:700 }}>{m}</span>)}
            </div>
            {tools.length > 0 && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                <span style={{ fontSize:'0.75rem', color:'#6b7280' }}>Makes music with:</span>
                {tools.map(t => <span key={t} style={{ background:'#34d39922', color:'#34d399', borderRadius:20, padding:'3px 12px', fontSize:'0.8rem', fontWeight:700 }}>{TOOL_EMOJI[t]||'✨'} {t}</span>)}
              </div>
            )}
            {soundsLike.length > 0 && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:'0.75rem', color:'#6b7280' }}>Sounds like:</span>
                {soundsLike.map(a => <span key={a} style={{ background:'rgba(255,255,255,0.06)', borderRadius:6, padding:'2px 10px', fontSize:'0.78rem', color:'#9ca3af' }}>{a}</span>)}
              </div>
            )}
          </div>
        )}

        {/* Releases */}
        {releases.length > 0 && (
          <div style={{ marginBottom:'1.5rem' }}>
            <div style={{ fontWeight:800, fontSize:'1.1rem', marginBottom:12 }}>🎵 Releases</div>
            <div style={{ display:'grid', gap:'0.75rem' }}>
              {releases.map(r => (
                <div key={r.id} style={{ border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.02)' }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{r.title}</div>
                    <div style={{ fontSize:'0.78rem', color:'#6b7280' }}>{r.releaseType} {r.releaseDate ? '· ' + new Date(r.releaseDate).getFullYear() : ''}</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {r.spotifyUrl && <a href={r.spotifyUrl} target="_blank" style={{ color:'#1db954', fontSize:'0.8rem', fontWeight:700 }}>Spotify ↗</a>}
                    {r.appleMusicUrl && <a href={r.appleMusicUrl} target="_blank" style={{ color:'#fc3c44', fontSize:'0.8rem', fontWeight:700 }}>Apple ↗</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {artist.links.length > 0 && (
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
            {artist.links.map(l => (
              <a key={l.id} href={l.url} target="_blank" style={{ border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'8px 20px', color:'#d1d5db', fontWeight:600, fontSize:'0.85rem', textDecoration:'none' }}>
                {l.label || l.platform} ↗
              </a>
            ))}
          </div>
        )}

        <div style={{ textAlign:'center', marginTop:'3rem', fontSize:'0.78rem', color:'#4b5563' }}>
          Powered by <a href="https://aiartistvault.com" style={{ color:'#7c3aed' }}>AI Artist Vault</a>
        </div>
      </div>
    </div>
  );
}
