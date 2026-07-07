"use client";
import { useState, useEffect } from 'react';

type Dna = {
  topGenres?: string; topMoods?: string; topThemes?: string; topTools?: string;
  bpmRange?: string; energyProfile?: string; soundsLike?: string; summary?: string;
  tags?: string; lastComputedAt?: string;
};

const TOOL_EMOJI: Record<string,string> = { suno:'🎵', udio:'🎶', musicfy:'🎤', aimusicgen:'🤖', loudly:'🔊', beatoven:'🥁', boomy:'💥', other:'✨' };
const ENERGY_COLOR: Record<string,string> = { low:'#60a5fa', medium:'#34d399', high:'#f87171' };

function parseJson<T>(s: string|undefined): T[] {
  if (!s) return [];
  try { return JSON.parse(s); } catch { return []; }
}

const s: Record<string, any> = {
  page: { maxWidth: 860, margin: '0 auto', padding: '2rem 1rem' },
  h1: { fontSize: '1.6rem', fontWeight: 800, margin: 0 },
  sub: { color: '#9ca3af', marginTop: '0.4rem', marginBottom: '2rem' },
  card: { border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem', background: 'rgba(255,255,255,0.02)', marginBottom: '1rem' },
  computeBtn: { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'#fff', border:'none', borderRadius:12, padding:'12px 28px', fontWeight:800, fontSize:'0.95rem', cursor:'pointer' },
  sectionHead: { fontSize:'0.72rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase' as const, letterSpacing:'0.1em', marginBottom:8, marginTop:20 },
  tagRow: { display:'flex', flexWrap:'wrap' as const, gap:8 },
  tag: (color:string): React.CSSProperties => ({ background: color+'22', color, borderRadius:20, padding:'4px 14px', fontSize:'0.8rem', fontWeight:600 }),
  pill: { background:'rgba(255,255,255,0.06)', borderRadius:6, padding:'3px 10px', fontSize:'0.75rem', color:'#9ca3af', fontFamily:'monospace' },
  summaryBox: { background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:12, padding:'1rem 1.2rem', fontSize:'0.95rem', lineHeight:1.7, color:'#e2e8f0', marginTop:8 },
  bpmBox: { display:'flex', gap:'1.5rem' },
  bpmStat: { textAlign:'center' as const },
  bpmNum: { fontSize:'1.8rem', fontWeight:800, color:'#a78bfa' },
  bpmLabel: { fontSize:'0.72rem', color:'#6b7280', textTransform:'uppercase' as const },
  emptyState: { textAlign:'center' as const, padding:'4rem 2rem', color:'#6b7280' },
  publicRow: { display:'flex', alignItems:'center', gap:12, marginTop:'0.5rem' },
  toggle: (on:boolean): React.CSSProperties => ({ background: on ? '#7c3aed' : 'rgba(255,255,255,0.1)', border:'none', borderRadius:20, padding:'6px 16px', color:'#fff', fontWeight:700, fontSize:'0.82rem', cursor:'pointer' }),
};

export default function StyleDnaPage() {
  const [dna, setDna] = useState<Dna|null>(null);
  const [artist, setArtist] = useState<{name:string;isPublic:boolean;slug?:string}|null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  useEffect(() => { fetchDna(); }, []);

  async function fetchDna() {
    setLoading(true);
    const res = await fetch('/api/style-dna');
    const data = await res.json();
    setDna(data.dna || null);
    setArtist(data.artist || null);
    setLoading(false);
  }

  async function compute() {
    setComputing(true);
    const res = await fetch('/api/style-dna', { method:'POST' });
    const data = await res.json();
    setDna(data.dna || null);
    setComputing(false);
  }

  async function togglePublic() {
    if (!artist) return;
    setTogglingPublic(true);
    await fetch('/api/artist-profile', {
      method: 'PATCH',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ isPublic: !artist.isPublic }),
    });
    setArtist(a => a ? {...a, isPublic: !a.isPublic} : null);
    setTogglingPublic(false);
  }

  const genres = parseJson<string>(dna?.topGenres);
  const moods = parseJson<string>(dna?.topMoods);
  const themes = parseJson<string>(dna?.topThemes);
  const tools = parseJson<string>(dna?.topTools);
  const soundsLike = parseJson<string>(dna?.soundsLike);
  const tags = parseJson<string>(dna?.tags);
  let bpm: {min:number;max:number;avg:number}|null = null;
  try { bpm = dna?.bpmRange ? JSON.parse(dna.bpmRange) : null; } catch {}

  return (
    <div style={s.page}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.4rem' }}>
        <div>
          <h1 style={s.h1}>🧬 Style DNA</h1>
          <p style={s.sub}>Your sonic fingerprint  -  auto-generated from your vault, releases, and prompts.</p>
        </div>
        <button style={s.computeBtn} onClick={compute} disabled={computing}>
          {computing ? '🔬 Analyzing...' : dna ? '🔄 Recompute' : '🧬 Generate My DNA'}
        </button>
      </div>

      {artist && (
        <div style={s.card}>
          <div style={{ fontWeight:700, marginBottom:6 }}>Public Profile</div>
          <div style={{ fontSize:'0.85rem', color:'#9ca3af', marginBottom:10 }}>
            When public, your profile appears in the AI Artist Directory and your Style DNA is visible to others.
          </div>
          <div style={s.publicRow}>
            <button style={s.toggle(artist.isPublic)} onClick={togglePublic} disabled={togglingPublic}>
              {artist.isPublic ? '🌐 Public' : '🔒 Private'}
            </button>
            {artist.isPublic && artist.slug && (
              <a href={`/artist/${artist.slug}`} target="_blank" style={{ color:'#a78bfa', fontSize:'0.85rem' }}>
                aiartistvault.com/artist/{artist.slug} ↗
              </a>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div style={s.emptyState}>Loading...</div>
      ) : !dna ? (
        <div style={s.emptyState}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>🧬</div>
          <div style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:8 }}>No Style DNA yet</div>
          <div style={{ fontSize:'0.9rem', marginBottom:20 }}>Add some releases or prompts to your vault, then hit Generate.</div>
        </div>
      ) : (
        <>
          {dna.summary && (
            <div style={s.card}>
              <div style={{ fontWeight:800, fontSize:'1rem', marginBottom:4 }}>Sound Summary</div>
              <div style={s.summaryBox}>{dna.summary}</div>
              {dna.lastComputedAt && <div style={{ fontSize:'0.73rem', color:'#4b5563', marginTop:8 }}>Last computed {new Date(dna.lastComputedAt).toLocaleDateString()}</div>}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div style={s.card}>
              <div style={{ fontWeight:800, marginBottom:4 }}>Genres</div>
              <div style={s.tagRow}>{genres.length ? genres.map(g => <span key={g} style={s.tag('#a78bfa')}>{g}</span>) : <span style={{color:'#4b5563'}}>None yet</span>}</div>
              <div style={s.sectionHead}>Moods</div>
              <div style={s.tagRow}>{moods.length ? moods.map(m => <span key={m} style={s.tag('#fb923c')}>{m}</span>) : <span style={{color:'#4b5563'}}>None yet</span>}</div>
            </div>

            <div style={s.card}>
              <div style={{ fontWeight:800, marginBottom:4 }}>AI Tools</div>
              <div style={s.tagRow}>
                {tools.length ? tools.map(t => (
                  <span key={t} style={s.tag('#34d399')}>{TOOL_EMOJI[t] || '✨'} {t}</span>
                )) : <span style={{color:'#4b5563'}}>None yet</span>}
              </div>
              {dna.energyProfile && (
                <>
                  <div style={s.sectionHead}>Energy Profile</div>
                  <span style={s.tag(ENERGY_COLOR[dna.energyProfile] || '#9ca3af')}>⚡ {dna.energyProfile}</span>
                </>
              )}
            </div>
          </div>

          {bpm && (
            <div style={s.card}>
              <div style={{ fontWeight:800, marginBottom:12 }}>BPM Range</div>
              <div style={s.bpmBox}>
                <div style={s.bpmStat}><div style={s.bpmNum}>{bpm.min}</div><div style={s.bpmLabel}>Min</div></div>
                <div style={s.bpmStat}><div style={s.bpmNum}>{bpm.avg}</div><div style={s.bpmLabel}>Avg</div></div>
                <div style={s.bpmStat}><div style={s.bpmNum}>{bpm.max}</div><div style={s.bpmLabel}>Max</div></div>
              </div>
            </div>
          )}

          {themes.length > 0 && (
            <div style={s.card}>
              <div style={{ fontWeight:800, marginBottom:8 }}>Themes & Tags</div>
              <div style={s.tagRow}>{themes.map(t => <span key={t} style={s.pill}>#{t}</span>)}</div>
            </div>
          )}

          {soundsLike.length > 0 && (
            <div style={s.card}>
              <div style={{ fontWeight:800, marginBottom:8 }}>Sounds Like</div>
              <div style={s.tagRow}>{soundsLike.map(a => <span key={a} style={s.tag('#60a5fa')}>{a}</span>)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
