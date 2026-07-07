'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  name: string;
  photoUrl?: string | null;
}

interface Props {
  currentProfileId?: string;
  onSwitch?: (profileId: string) => void;
}

export default function ProfileSwitcher({ currentProfileId, onSwitch }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/artist-profile").then(r => r.json()).then(d => setProfiles(d.profiles ?? []));
    fetch("/api/stripe/status").then(r => r.json()).then(d => setIsPaid(d.isPaid ?? false));
  }, []);

  const current = profiles.find(p => p.id === currentProfileId) ?? profiles[0];

  async function createProfile() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/artist-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (data.error === "UPGRADE_REQUIRED") {
      router.push("/vault/upgrade");
      return;
    }
    if (data.profile) {
      setProfiles(prev => [...prev, data.profile]);
      setNewName("");
      onSwitch?.(data.profile.id);
    }
    setCreating(false);
    setOpen(false);
  }

  if (profiles.length === 0) return null;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
        {current?.photoUrl
          ? <img src={current.photoUrl} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
          : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#a855f7,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{current?.name?.[0] ?? "?"}</div>
        }
        <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current?.name ?? "Select Profile"}</span>
        <span style={{ color: "#9ca3af", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 220, background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, boxShadow: "0 20px 40px rgba(0,0,0,0.5)", zIndex: 100, overflow: "hidden" }}>

          {profiles.map(p => (
            <button key={p.id} onClick={() => { onSwitch?.(p.id); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: p.id === currentProfileId ? "rgba(168,85,247,0.15)" : "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 14, textAlign: "left" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#a855f7,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{p.name[0]}</div>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              {p.id === currentProfileId && <span style={{ marginLeft: "auto", color: "#a855f7", fontSize: 12 }}>✓</span>}
            </button>
          ))}

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 14px" }}>
            {isPaid ? (
              <div>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="New profile name..."
                  style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 13, marginBottom: 8, boxSizing: "border-box" }}
                  onKeyDown={e => e.key === "Enter" && createProfile()}
                />
                <button onClick={createProfile} disabled={creating || !newName.trim()}
                  style={{ width: "100%", background: "linear-gradient(135deg,#a855f7,#6366f1)", color: "#fff", border: "none", borderRadius: 8, padding: "7px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: creating ? 0.7 : 1 }}>
                  {creating ? "Creating..." : "+ Add Profile"}
                </button>
              </div>
            ) : (
              <button onClick={() => router.push("/vault/upgrade")}
                style={{ width: "100%", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)", color: "#a855f7", borderRadius: 8, padding: "7px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ✦ Upgrade for multiple profiles
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
