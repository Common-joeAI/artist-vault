"use client";
import { useState } from 'react';

const GENRES = ['Hip-Hop','Pop','Electronic','R&B','Lo-Fi','Ambient','Rock','Jazz','Classical','Trap','House','Drill','Synthwave','Afrobeats','Latin','Country','Folk','Metal','Punk','Soul'];
const AI_TOOLS = ['Suno','Udio','Musicfy','MusicGen','Loudly','Beatoven','Boomy','Other'];
const VIBES = ['Dark & Moody','Uplifting & Positive','Chill & Relaxed','High Energy','Melancholic','Aggressive','Romantic','Mysterious','Epic & Cinematic','Playful & Fun'];

type Metadata = {
  title?: string;
  subtitle?: string;
  genre?: string;
  subgenre?: string;
  mood?: string[];
  themes?: string[];
  bpm_estimate?: number;
  key?: string;
  energy_level?: string;
  description?: string;
  short_bio?: string;
  tags?: string[];
  similar_artists?: string[];
  playlist_pitch?: string;
  press_blurb?: string;
  release_type?: string;
  explicit?: boolean;
};

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 860, margin: '0 auto', padding: '2rem 1rem' },
  h1: { fontSize: '1.6rem', fontWeight: 800, margin: 0 },
  sub: { color: '#9ca3af', marginTop: '0.4rem', marginBottom: '2rem' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
  card: { border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem', background: 'rgba(255,255,255,0.02)' },
  label: { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, marginTop: 14 },
  input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' as const },
  textarea: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' as const, resize: 'vertical' as const, minHeight: 80 },
  select: { width: '100%', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '0.9rem' },
  chipRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 2 },
  chip: (active: boolean): React.CSSProperties => ({ border: active ? '2px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', background: active ? '#7c3aed22' : 'transparent', color: active ? '#a78bfa' : '#9ca3af' }),
  generateBtn: { width: '100%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: '1.25rem', letterSpacing: '0.02em' },
  resultCard: { border: '1px solid rgba(124,58,237,0.4)', borderRadius: 16, padding: '1.75rem', background: 'rgba(124,58,237,0.05)', marginTop: '1.5rem' },
  resultTitle: { fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, margin: '10px 0' },
  badge: (color: string): React.CSSProperties => ({ background: color + '22', color, borderRadius: 20, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700 }),
  sectionHead: { fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginTop: 18, marginBottom: 6 },
  textBlock: { background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', fontSize: '0.88rem', color: '#d1d5db', lineHeight: 1.6 },
  tagRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  tag: { background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' },
  copyBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', cursor: 'pointer', color: '#d1d5db', marginLeft: 8 },
  saveBtn: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', marginTop: 16 },
};

function copy(text: string) { navigator.clipboard.writeText(text).catch(() => {}); }

export default function MetadataGenPage() {
  const [title, setTitle] = useState('');
  const [vibe, setVibe] = useState('');
  const [genre, setGenre] = useState('');
  const [aiTool, setAiTool] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Metadata | null>(null);
  const [copied, setCopied] = useState('');

  async function generate() {
    if (!title.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await fetch('/api/metadata-gen', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, vibe, genre, aiTool, additionalContext: context }),
    });
    const data = await res.json();
    setResult(data.metadata || null);
    setLoading(false);
  }

  function handleCopy(text: string, key: string) {
    copy(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  const energyColor: Record<string, string> = { low: '#60a5fa', medium: '#34d399', high: '#f87171' };

  return (
    <div style={s.page}>
      <h1 style={s.h1}>✨ AI Metadata Generator</h1>
      <p style={s.sub}>Describe your track — Groq writes your complete release metadata in seconds.</p>

      <div style={s.card}>
        <label style={s.label}>Track Title *</label>
        <input style={s.input} placeholder="e.g. Midnight Protocol" value={title} onChange={e => setTitle(e.target.value)} />

        <div style={s.twoCol}>
          <div>
            <label style={s.label}>Genre</label>
            <div style={s.chipRow}>
              {GENRES.map(g => <span key={g} style={s.chip(genre === g)} onClick={() => setGenre(genre === g ? '' : g)}>{g}</span>)}
            </div>
          </div>
          <div>
            <label style={s.label}>Vibe / Feel</label>
            <div style={s.chipRow}>
              {VIBES.map(v => <span key={v} style={s.chip(vibe === v)} onClick={() => setVibe(vibe === v ? '' : v)}>{v}</span>)}
            </div>
          </div>
        </div>

        <label style={s.label}>AI Tool Used</label>
        <div style={s.chipRow}>
          {AI_TOOLS.map(t => <span key={t} style={s.chip(aiTool === t)} onClick={() => setAiTool(aiTool === t ? '' : t)}>{t}</span>)}
        </div>

        <label style={s.label}>Additional Context (optional)</label>
        <textarea style={s.textarea} placeholder="e.g. dark trap beat, 808s heavy, sounds like late night driving..." value={context} onChange={e => setContext(e.target.value)} />

        <button style={s.generateBtn} onClick={generate} disabled={loading || !title.trim()}>
          {loading ? '🤖 Groq is thinking...' : '⚡ Generate Metadata'}
        </button>
      </div>

      {result && (
        <div style={s.resultCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={s.resultTitle}>{result.title}</div>
              {result.subtitle && <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{result.subtitle}</div>}
            </div>
            <button style={s.copyBtn} onClick={() => handleCopy(JSON.stringify(result, null, 2), 'all')}>
              {copied === 'all' ? '✅ Copied' : '📋 Copy All'}
            </button>
          </div>

          <div style={s.metaRow}>
            {result.genre && <span style={s.badge('#a78bfa')}>{result.genre}</span>}
            {result.subgenre && <span style={s.badge('#818cf8')}>{result.subgenre}</span>}
            {result.release_type && <span style={s.badge('#34d399')}>{result.release_type}</span>}
            {result.energy_level && <span style={s.badge(energyColor[result.energy_level] ?? '#9ca3af')}>⚡ {result.energy_level} energy</span>}
            {result.bpm_estimate && <span style={s.badge('#fb923c')}>~{result.bpm_estimate} BPM</span>}
            {result.key && <span style={s.badge('#f472b6')}>Key of {result.key}</span>}
          </div>

          {result.mood && result.mood.length > 0 && (
            <>
              <div style={s.sectionHead}>Mood</div>
              <div style={s.tagRow}>{result.mood.map(m => <span key={m} style={s.tag}>{m}</span>)}</div>
            </>
          )}

          {result.description && (
            <>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={s.sectionHead}>Description</div>
                <button style={s.copyBtn} onClick={() => handleCopy(result.description!, 'desc')}>{copied === 'desc' ? '✅' : '📋'}</button>
              </div>
              <div style={s.textBlock}>{result.description}</div>
            </>
          )}

          {result.short_bio && (
            <>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={s.sectionHead}>One-liner</div>
                <button style={s.copyBtn} onClick={() => handleCopy(result.short_bio!, 'bio')}>{copied === 'bio' ? '✅' : '📋'}</button>
              </div>
              <div style={s.textBlock}>{result.short_bio}</div>
            </>
          )}

          {result.playlist_pitch && (
            <>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={s.sectionHead}>Playlist Pitch</div>
                <button style={s.copyBtn} onClick={() => handleCopy(result.playlist_pitch!, 'pitch')}>{copied === 'pitch' ? '✅' : '📋'}</button>
              </div>
              <div style={s.textBlock}>{result.playlist_pitch}</div>
            </>
          )}

          {result.press_blurb && (
            <>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={s.sectionHead}>Press Blurb</div>
                <button style={s.copyBtn} onClick={() => handleCopy(result.press_blurb!, 'press')}>{copied === 'press' ? '✅' : '📋'}</button>
              </div>
              <div style={s.textBlock}>{result.press_blurb}</div>
            </>
          )}

          {result.tags && result.tags.length > 0 && (
            <>
              <div style={s.sectionHead}>Tags</div>
              <div style={s.tagRow}>{result.tags.map(t => <span key={t} style={s.tag}>#{t}</span>)}</div>
            </>
          )}

          {result.similar_artists && result.similar_artists.length > 0 && (
            <>
              <div style={s.sectionHead}>Sounds Like</div>
              <div style={s.tagRow}>{result.similar_artists.map(a => <span key={a} style={s.tag}>{a}</span>)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
