"use client";
import { useState, useEffect } from 'react';

const ROLES = ['Vocalist','Beatmaker','Lyricist','Mixing Engineer','Mastering Engineer','Producer','Composer','Rapper','Visual Artist','Graphic Designer','Music Video Director','Social Media Manager'];
const CONTACT_METHODS = ['Email','Discord','Instagram','Twitter/X','TikTok','Direct Message'];
const GENRES = ['Hip-Hop','Pop','Electronic','R&B','Lo-Fi','Trap','House','Synthwave','Ambient','Rock','Jazz'];

type Post = {
  id:string; title:string; description:string; type:string; role:string;
  genres?:string; moods?:string; tools?:string; contactMethod?:string; contactValue?:string;
  isOpen:boolean; createdAt:string;
  artist?: { name:string; photoUrl?:string; slug?:string; };
};

function parseJson<T>(s: string|null|undefined): T[] {
  if (!s) return []; try { return JSON.parse(s); } catch { return []; }
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' },
  hero: { background:'linear-gradient(180deg,rgba(124,58,237,0.2) 0%,transparent 100%)', padding:'4rem 1rem 2rem', textAlign:'center' as const },
  h1: { fontSize:'2.2rem', fontWeight:900, marginBottom:8 },
  sub: { color:'#9ca3af', marginBottom:'1.5rem' },
  inner: { maxWidth:860, margin:'0 auto', padding:'0 1rem 4rem' },
  postBtn: { background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'#fff', border:'none', borderRadius:12, padding:'12px 28px', fontWeight:800, fontSize:'0.95rem', cursor:'pointer', marginBottom:'1.5rem' },
  filterRow: { display:'flex', gap:8, flexWrap:'wrap' as const, marginBottom:'1.5rem', justifyContent:'center' },
  filterBtn: (active:boolean): React.CSSProperties => ({ border: active ? '2px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'5px 14px', background: active ? '#7c3aed22' : 'transparent', cursor:'pointer', fontSize:'0.8rem', fontWeight:600, color: active ? '#a78bfa' : '#9ca3af' }),
  card: { border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'1.5rem', background:'rgba(255,255,255,0.02)', marginBottom:'0.75rem' },
  cardTop: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 },
  typeBadge: (t:string): React.CSSProperties => ({ background: t==='SEEKING' ? '#7c3aed22' : '#34d39922', color: t==='SEEKING' ? '#a78bfa' : '#34d399', borderRadius:20, padding:'3px 12px', fontSize:'0.75rem', fontWeight:700 }),
  title: { fontWeight:800, fontSize:'1.05rem', marginBottom:4 },
  desc: { color:'#9ca3af', fontSize:'0.88rem', lineHeight:1.6, marginBottom:10 },
  tagRow: { display:'flex', flexWrap:'wrap' as const, gap:6 },
  tag: (c:string): React.CSSProperties => ({ background:c+'22', color:c, borderRadius:20, padding:'2px 10px', fontSize:'0.73rem', fontWeight:700 }),
  artistRow: { display:'flex', alignItems:'center', gap:8, marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.06)' },
  modal: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'1rem' },
  modalBox: { background:'#111', border:'1px solid rgba(255,255,255,0.12)', borderRadius:18, padding:'2rem', width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' as const },
  label: { display:'block', fontSize:'0.75rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase' as const, letterSpacing:'0.08em', marginBottom:6, marginTop:14 },
  input: { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 14px', color:'#fff', fontSize:'0.9rem', boxSizing:'border-box' as const },
  textarea: { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 14px', color:'#fff', fontSize:'0.9rem', boxSizing:'border-box' as const, resize:'vertical' as const, minHeight:80 },
  chipRow: { display:'flex', flexWrap:'wrap' as const, gap:6 },
  chip: (active:boolean): React.CSSProperties => ({ border: active ? '2px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'4px 12px', fontSize:'0.78rem', fontWeight:600, cursor:'pointer', background: active ? '#7c3aed22' : 'transparent', color: active ? '#a78bfa' : '#9ca3af' }),
  btnRow: { display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' },
  cancelBtn: { background:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 18px', color:'#9ca3af', cursor:'pointer', fontWeight:600 },
  saveBtn: { background:'#7c3aed', color:'#fff', border:'none', borderRadius:10, padding:'10px 22px', fontWeight:700, cursor:'pointer' },
  emptyState: { textAlign:'center' as const, padding:'4rem', color:'#6b7280' },
};

export default function CollabPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('SEEKING');
  const [role, setRole] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [contactMethod, setContactMethod] = useState('');
  const [contactValue, setContactValue] = useState('');

  useEffect(() => { fetchPosts(); }, [filterType]);

  async function fetchPosts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set('type', filterType);
    const res = await fetch('/api/collab?' + params.toString());
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!title || !description || !role) return;
    setSaving(true);
    await fetch('/api/collab', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ title, description, type, role, genres: selectedGenres, contactMethod, contactValue }),
    });
    setSaving(false);
    setShowModal(false);
    setTitle(''); setDescription(''); setRole(''); setSelectedGenres([]); setContactMethod(''); setContactValue('');
    fetchPosts();
  }

  function toggleGenre(g: string) { setSelectedGenres(prev => prev.includes(g) ? prev.filter(x=>x!==g) : [...prev, g]); }

  return (
    <div style={s.page}>
      <div style={s.hero}>
        <h1 style={s.h1}>🤝 Collab Board</h1>
        <p style={s.sub}>Find AI artists to collaborate with — or offer your skills to the community</p>
        <button style={s.postBtn} onClick={() => setShowModal(true)}>+ Post Collab</button>
        <div style={s.filterRow}>
          <button style={s.filterBtn(filterType==='')} onClick={() => setFilterType('')}>All Posts</button>
          <button style={s.filterBtn(filterType==='SEEKING')} onClick={() => setFilterType(filterType==='SEEKING' ? '' : 'SEEKING')}>🔍 Seeking</button>
          <button style={s.filterBtn(filterType==='OFFERING')} onClick={() => setFilterType(filterType==='OFFERING' ? '' : 'OFFERING')}>🙋 Offering</button>
        </div>
      </div>

      <div style={s.inner}>
        {loading ? (
          <div style={s.emptyState}>Loading...</div>
        ) : posts.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>🤝</div>
            <div style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:8 }}>No collab posts yet</div>
            <div style={{ marginBottom:20 }}>Be the first to post — the community is waiting.</div>
            <button style={s.postBtn} onClick={() => setShowModal(true)}>+ Post Collab</button>
          </div>
        ) : (
          posts.map(p => {
            const genres = parseJson<string>(p.genres);
            return (
              <div key={p.id} style={s.card}>
                <div style={s.cardTop}>
                  <div>
                    <div style={s.title}>{p.title}</div>
                    <div style={{ fontSize:'0.8rem', color:'#6b7280' }}>{p.role} · {new Date(p.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span style={s.typeBadge(p.type)}>{p.type === 'SEEKING' ? '🔍 Seeking' : '🙋 Offering'}</span>
                </div>
                <div style={s.desc}>{p.description}</div>
                <div style={s.tagRow}>
                  {genres.map(g => <span key={g} style={s.tag('#a78bfa')}>{g}</span>)}
                </div>
                {p.contactMethod && p.contactValue && (
                  <div style={{ marginTop:10, fontSize:'0.82rem', color:'#9ca3af' }}>
                    📬 {p.contactMethod}: <span style={{ color:'#d1d5db', fontWeight:600 }}>{p.contactValue}</span>
                  </div>
                )}
                {p.artist && (
                  <div style={s.artistRow}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'#7c3aed', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}>🎵</div>
                    <span style={{ fontSize:'0.82rem', color:'#9ca3af' }}>
                      {p.artist.slug ? <a href={`/artist/${p.artist.slug}`} style={{ color:'#a78bfa', fontWeight:600 }}>{p.artist.name}</a> : <span style={{ fontWeight:600, color:'#d1d5db' }}>{p.artist.name}</span>}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div style={s.modal} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={s.modalBox}>
            <h2 style={{ margin:'0 0 4px', fontWeight:800 }}>Post a Collab</h2>
            <p style={{ color:'#6b7280', fontSize:'0.85rem', marginBottom:4 }}>Let the community know what you need or what you offer.</p>

            <label style={s.label}>I am...</label>
            <div style={s.chipRow}>
              <span style={s.chip(type==='SEEKING')} onClick={() => setType('SEEKING')}>🔍 Seeking someone</span>
              <span style={s.chip(type==='OFFERING')} onClick={() => setType('OFFERING')}>🙋 Offering my skills</span>
            </div>

            <label style={s.label}>Role *</label>
            <div style={s.chipRow}>
              {ROLES.map(r => <span key={r} style={s.chip(role===r)} onClick={() => setRole(r)}>{r}</span>)}
            </div>

            <label style={s.label}>Title *</label>
            <input style={s.input} placeholder="e.g. Looking for a vocalist for dark trap project" value={title} onChange={e => setTitle(e.target.value)} />

            <label style={s.label}>Description *</label>
            <textarea style={s.textarea} placeholder="Describe the project, your style, what you're looking for..." value={description} onChange={e => setDescription(e.target.value)} />

            <label style={s.label}>Genres</label>
            <div style={s.chipRow}>
              {GENRES.map(g => <span key={g} style={s.chip(selectedGenres.includes(g))} onClick={() => toggleGenre(g)}>{g}</span>)}
            </div>

            <label style={s.label}>Contact Method</label>
            <div style={s.chipRow}>
              {CONTACT_METHODS.map(m => <span key={m} style={s.chip(contactMethod===m)} onClick={() => setContactMethod(m)}>{m}</span>)}
            </div>
            {contactMethod && <input style={{ ...s.input, marginTop:8 }} placeholder={`Your ${contactMethod}...`} value={contactValue} onChange={e => setContactValue(e.target.value)} />}

            <div style={s.btnRow}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving || !title || !description || !role}>
                {saving ? 'Posting...' : '🤝 Post Collab'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
