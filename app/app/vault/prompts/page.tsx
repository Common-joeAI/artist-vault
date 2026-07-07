"use client";
import { useState, useEffect, useCallback } from 'react';

const AI_TOOLS = [
  { id: 'suno', label: 'Suno', emoji: '🎵' },
  { id: 'udio', label: 'Udio', emoji: '🎶' },
  { id: 'musicfy', label: 'Musicfy', emoji: '🎤' },
  { id: 'aimusicgen', label: 'MusicGen', emoji: '🤖' },
  { id: 'loudly', label: 'Loudly', emoji: '🔊' },
  { id: 'beatoven', label: 'Beatoven', emoji: '🥁' },
  { id: 'boomy', label: 'Boomy', emoji: '💥' },
  { id: 'other', label: 'Other', emoji: '✨' },
];

const MOODS = ['Dark','Uplifting','Melancholic','Energetic','Chill','Aggressive','Romantic','Mysterious','Epic','Playful'];

type Prompt = {
  id: string;
  promptText: string;
  aiTool: string;
  aiModel?: string;
  enhancedTitle?: string;
  enhancedGenre?: string;
  enhancedMood?: string;
  enhancedDescription?: string;
  enhancedTags?: string;
  styleTags?: string;
  resultRating?: number;
  resultNotes?: string;
  isPublic: boolean;
  createdAt: string;
};

// ── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, any> = {
  page: { maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  h1: { fontSize: '1.6rem', fontWeight: 800, margin: 0 },
  sub: { color: '#9ca3af', marginBottom: '1.75rem', marginTop: '0.4rem' },
  addBtn: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' },
  modalBox: { background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: '2rem', width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' },
  label: { display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, marginTop: 16 },
  textarea: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: '0.9rem', resize: 'vertical', minHeight: 120, boxSizing: 'border-box' },
  input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' },
  toolGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 4 },
  toolBtn: (active: boolean): React.CSSProperties => ({ border: active ? '2px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 6px', background: active ? '#7c3aed22' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }),
  stars: { display: 'flex', gap: 6, fontSize: '1.4rem', cursor: 'pointer' },
  btnRow: { display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' },
  cancelBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 18px', color: '#9ca3af', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' },
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' },
  filterBtn: (active: boolean): React.CSSProperties => ({ border: active ? '2px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '5px 14px', background: active ? '#7c3aed22' : 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: active ? '#a78bfa' : '#9ca3af' }),
  grid: { display: 'grid', gap: '1rem' },
  card: { border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontWeight: 800, fontSize: '1rem', marginBottom: 2 },
  cardMeta: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  badge: (color: string): React.CSSProperties => ({ background: color + '22', color, borderRadius: 20, padding: '2px 10px', fontSize: '0.73rem', fontWeight: 700 }),
  promptBox: { background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', fontSize: '0.85rem', color: '#d1d5db', fontFamily: 'monospace', lineHeight: 1.6, marginBottom: 10 },
  tags: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  tag: { background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', fontSize: '0.73rem', color: '#9ca3af' },
  emptyState: { textAlign: 'center', padding: '4rem 2rem', color: '#6b7280' },
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={s.stars}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => onChange(n)} style={{ opacity: n <= value ? 1 : 0.25 }}>⭐</span>
      ))}
    </div>
  );
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterTool, setFilterTool] = useState('all');

  // Form state
  const [promptText, setPromptText] = useState('');
  const [aiTool, setAiTool] = useState('suno');
  const [aiModel, setAiModel] = useState('');
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/prompts');
    const data = await res.json();
    setPrompts(data.prompts || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  async function handleSave() {
    if (!promptText.trim()) return;
    setSaving(true);
    await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ promptText, aiTool, aiModel, resultRating: rating || null, resultNotes: notes || null, isPublic }),
    });
    setSaving(false);
    setShowModal(false);
    setPromptText(''); setAiTool('suno'); setAiModel(''); setRating(0); setNotes(''); setIsPublic(false);
    fetchPrompts();
  }

  const filtered = filterTool === 'all' ? prompts : prompts.filter(p => p.aiTool === filterTool);
  const toolsUsed = [...new Set(prompts.map(p => p.aiTool))];

  return (
    <div style={s.page}>
      <div style={s.row}>
        <div>
          <h1 style={s.h1}>🧠 Prompt Vault</h1>
          <p style={s.sub}>Archive every AI prompt that made a great track. Never lose a sound again.</p>
        </div>
        <button style={s.addBtn} onClick={() => setShowModal(true)}>+ Save Prompt</button>
      </div>

      {/* Filter bar */}
      {prompts.length > 0 && (
        <div style={s.filterRow}>
          <button style={s.filterBtn(filterTool === 'all')} onClick={() => setFilterTool('all')}>All ({prompts.length})</button>
          {toolsUsed.map(tool => {
            const t = AI_TOOLS.find(t => t.id === tool);
            return (
              <button key={tool} style={s.filterBtn(filterTool === tool)} onClick={() => setFilterTool(tool)}>
                {t?.emoji} {t?.label ?? tool} ({prompts.filter(p => p.aiTool === tool).length})
              </button>
            );
          })}
        </div>
      )}

      {/* Prompt cards */}
      {loading ? (
        <div style={s.emptyState}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧠</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>No prompts saved yet</div>
          <div style={{ fontSize: '0.9rem' }}>Save the prompt that made your best track  -  Groq will analyze and tag it automatically.</div>
        </div>
      ) : (
        <div style={s.grid}>
          {filtered.map(p => {
            const tool = AI_TOOLS.find(t => t.id === p.aiTool);
            let tags: string[] = [];
            try { tags = JSON.parse(p.enhancedTags || '[]'); } catch {}
            return (
              <div key={p.id} style={s.card}>
                <div style={s.cardTop}>
                  <div>
                    <div style={s.cardTitle}>{p.enhancedTitle || 'Untitled Prompt'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                      {p.resultRating ? ' · ' + '⭐'.repeat(p.resultRating) : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={s.badge('#a78bfa')}>{tool?.emoji} {tool?.label ?? p.aiTool}</span>
                    {p.enhancedGenre && <span style={s.badge('#34d399')}>{p.enhancedGenre}</span>}
                    {p.enhancedMood && <span style={s.badge('#fb923c')}>{p.enhancedMood}</span>}
                  </div>
                </div>
                {p.enhancedDescription && (
                  <div style={{ fontSize: '0.83rem', color: '#9ca3af', marginBottom: 10 }}>{p.enhancedDescription}</div>
                )}
                <div style={s.promptBox}>{p.promptText}</div>
                {tags.length > 0 && (
                  <div style={s.tags}>
                    {tags.map(t => <span key={t} style={s.tag}>#{t}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={s.modal} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={s.modalBox}>
            <h2 style={{ margin: '0 0 4px', fontWeight: 800 }}>Save a Prompt</h2>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 4 }}>Groq will automatically analyze and tag it.</p>

            <label style={s.label}>AI Tool</label>
            <div style={s.toolGrid}>
              {AI_TOOLS.map(t => (
                <button key={t.id} style={s.toolBtn(aiTool === t.id)} onClick={() => setAiTool(t.id)}>
                  <div>{t.emoji}</div><div>{t.label}</div>
                </button>
              ))}
            </div>

            <label style={s.label}>Model / Version (optional)</label>
            <input style={s.input} placeholder="e.g. v3.5, chirp-v3" value={aiModel} onChange={e => setAiModel(e.target.value)} />

            <label style={s.label}>Prompt Text *</label>
            <textarea style={s.textarea} placeholder="Paste the exact prompt you used..." value={promptText} onChange={e => setPromptText(e.target.value)} />

            <label style={s.label}>How did it turn out? (optional)</label>
            <StarRating value={rating} onChange={setRating} />

            <label style={s.label}>Notes (optional)</label>
            <input style={s.input} placeholder="What worked, what didn't..." value={notes} onChange={e => setNotes(e.target.value)} />

            <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
              Make this prompt public (share with the AI artist community)
            </label>

            <div style={s.btnRow}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving || !promptText.trim()}>
                {saving ? '✨ Analyzing...' : '💾 Save Prompt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
