"use client";
import { useState, useEffect } from 'react';

const TOOL_EMOJI: Record<string,string> = { suno:'🎵', udio:'🎶', musicfy:'🎤', aimusicgen:'🤖', loudly:'🔊', beatoven:'🥁', boomy:'💥', other:'✨' };
const ENERGY_COLOR: Record<string,string> = { low:'#60a5fa', medium:'#34d399', high:'#f87171' };

function parseJson<T>(s: string | null | undefined): T[] {
  if (!s) return [];
  try { return JSON.parse(s); } catch { return []; }
}

type Artist = {
  id: string; name: string; bio?: string; photoUrl?: string; slug?: string; location?: string;
  dna?: { topGenres?:string; topMoods?:string; topTools?:string; energyProfile?:string; summary?:string; soundsLike?:string; };
};

const s: Record<string, any> = {
  page: { minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' },
  hero: { background:'linear-gradient(180deg,rgba(124,58,237,0.2) 0%,transparent 100%)', padding:'4rem 1rem 2rem', textAlign:'center' as const },
  h1: { fontSize:'2.2rem', fontWeight:900, marginBottom:8 },
  sub: { color:'#9ca3af', marginBottom:'2rem' },
  inner: { maxWidth:1000, margin:'0 auto', padding:'0 1rem 4rem' },
  filterRow: { display:'flex', gap:8, flexWrap:'wrap' as const, marginBottom:'1.5rem', justifyContent:'center' },
  filterBtn: (active:boolean): React.CSSProperties => ({ border: active ? '2px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'6px 16px', background: active ? '#7c3aed22' : 'transparent', cursor:'pointer', fontSize:'0.82rem', fontWeight:600, color: active ? '#a78bfa' : '#9ca3af' }),
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' },
  card: { border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'1.5rem', background:'rgba(255,255,255,0.02)', transition:'border-color 0.2s' },
  avatar: { width:56, height:56, borderRadius:'50%', objectFit:'cover' as const, border:'2px solid #7c3aed', marginBottom:12 },
  avatarPlaceholder: { width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#4f46e5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', marginBottom:12 },
  artistName: { fontWeight:800, fontSize:'1.05rem', marginBottom:4 },
  tagRow: { display:'flex', flexWrap:'wrap' as const, gap:6, marginTop:8 },
  tag: (color:string): React.CSSProperties => ({ background:color+'22', color, borderRadius:20, padding:'2px 10px', fontSize:'0.73rem', fontWeight:700 }),
  viewBtn: { display:'block', textAlign:'center' as const, marginTop:12, background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', borderRadius:10, padding:'7px', color:'#a78bfa', fontWeight:700, fontSize:'0.82rem', textDecoration:'none' },
  searchInput: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'10px 18px', color:'#fff', fontSize:'0.95rem', width:'100%', maxWidth:400, marginBottom:'1.5rem', boxSizing:'border-box' as const },
  emptyState: { textAlign:'center' as const, padding:'4rem', color:'#6b7280' },
};

const GENRE_FILTERS = ['Hip-Hop','Pop','Electronic','R&B','Lo-Fi','Trap','House','Synthwave','Ambient'];
const TOOL_FILTERS = ['suno','udio','musicfy','aimusicgen'];

export default function DirectoryPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('');
  const [activeTool, setActiveTool] = useState('');

  useEffect(() => { fetchArtists(); }, [activeGenre, activeTool]);

  async function fetchArtists() {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeGenre) params.set('genre', activeGenre);
    if (activeTool) params.set('tool', activeTool);
    const res = await fetch('/api/directory?' + params.toString());
    const data = await res.json();
    setArtists(data.artists || []);
    setLoading(false);
  }

  const filtered = search ? artists.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.dna?.summary?.toLowerCase().includes(search.toLowerCase())) : artists;

  return (
    <div style={s.page}>
      <div style={s.hero}>
        <h1 style={s.h1}>🌐 AI Artist Directory</h1>
        <p style={s.sub}>Discover AI music creators from around the world</p>
        <input style={s.searchInput} placeholder="Search artists..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={s.filterRow}>
          <button style={s.filterBtn(activeGenre==='')} onClick={() => setActiveGenre('')}>All</button>
          {GENRE_FILTERS.map(g => <button key={g} style={s.filterBtn(activeGenre===g)} onClick={() => setActiveGenre(activeGenre===g ? '' : g)}>{g}</button>)}
        </div>
        <div style={s.filterRow}>
          {TOOL_FILTERS.map(t => <button key={t} style={s.filterBtn(activeTool===t)} onClick={() => setActiveTool(activeTool===t ? '' : t)}>{TOOL_EMOJI[t]} {t}</button>)}
        </div>
      </div>

      <div style={s.inner}>
        {loading ? (
          <div style={s.emptyState}>Loading artists...</div>
        ) : filtered.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>🌐</div>
            <div style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:8 }}>No artists yet</div>
            <div>Be the first to make your profile public!</div>
          </div>
        ) : (
          <div style={s.grid}>
            {filtered.map(a => {
              const genres = parseJson<string>(a.dna?.topGenres);
              const tools = parseJson<string>(a.dna?.topTools);
              return (
                <div key={a.id} style={s.card}>
                  {a.photoUrl ? <img src={a.photoUrl} alt={a.name} style={s.avatar} /> : <div style={s.avatarPlaceholder}>🎵</div>}
                  <div style={s.artistName}>{a.name}</div>
                  {a.location && <div style={{ fontSize:'0.75rem', color:'#6b7280', marginBottom:4 }}>📍 {a.location}</div>}
                  {a.dna?.summary && <div style={{ fontSize:'0.82rem', color:'#9ca3af', lineHeight:1.6 }}>{a.dna.summary.slice(0,120)}...</div>}
                  <div style={s.tagRow}>
                    {genres.slice(0,3).map(g => <span key={g} style={s.tag('#a78bfa')}>{g}</span>)}
                    {tools.slice(0,2).map(t => <span key={t} style={s.tag('#34d399')}>{TOOL_EMOJI[t]||'✨'} {t}</span>)}
                    {a.dna?.energyProfile && <span style={s.tag(ENERGY_COLOR[a.dna.energyProfile]||'#9ca3af')}>⚡ {a.dna.energyProfile}</span>}
                  </div>
                  {a.slug && <a href={`/artist/${a.slug}`} style={s.viewBtn}>View Profile →</a>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
