#!/usr/bin/env python3
"""
ascap_checker.py
Checks PRO registration status for all Artist Vault artists via MusicBrainz.
- Exact name match -> IPI found = PRO registered
- ISRC lookup fallback to confirm works are registered
- Flags unregistered artists, updates ProRegistration table, emails nudge
"""

import sqlite3, requests, time, smtplib, os, datetime, secrets

DB_PATH = '/opt/containers/artist-vault/data/dev.db'
os.makedirs('/opt/containers/artist-vault/logs', exist_ok=True)
LOG = '/opt/containers/artist-vault/logs/ascap_checker.log'

MB_HEADERS = {"User-Agent": "ArtistVaultBot/1.0 (bennettjoseph99@gmail.com)"}
MB_BASE = "https://musicbrainz.org/ws/2"

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")

def log(msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG, "a") as f:
        f.write(line + "\n")

def mb_get(path, params={}):
    p = dict(params)
    p["fmt"] = "json"
    try:
        r = requests.get(f"{MB_BASE}{path}", params=p, headers=MB_HEADERS, timeout=10)
        time.sleep(1.1)
        return r.json() if r.status_code == 200 else None
    except Exception as e:
        log(f"  MB error: {e}")
        return None

def check_artist_pro(artist_name):
    """
    Returns (ipi, isni, mb_id, status_str)
    status: REGISTERED | FOUND_NO_IPI | NOT_FOUND
    """
    data = mb_get("/artist/", {"query": f'artist:"{artist_name}"', "limit": 10})
    if not data:
        return None, None, None, "ERROR"

    artists = data.get("artists", [])
    name_lower = artist_name.lower().strip()

    # First pass: exact match
    for a in artists:
        mb_name = a.get("name", "").lower().strip()
        if mb_name == name_lower:
            ipis = a.get("ipis", [])
            isnis = a.get("isnis", [])
            mb_id = a.get("id")
            if ipis:
                return ipis[0], isnis[0] if isnis else None, mb_id, "REGISTERED"
            return None, isnis[0] if isnis else None, mb_id, "FOUND_NO_IPI"

    # Second pass: partial match
    for a in artists:
        mb_name = a.get("name", "").lower().strip()
        if name_lower in mb_name or mb_name in name_lower:
            ipis = a.get("ipis", [])
            isnis = a.get("isnis", [])
            mb_id = a.get("id")
            if ipis:
                return ipis[0], isnis[0] if isnis else None, mb_id, "REGISTERED"
            return None, isnis[0] if isnis else None, mb_id, "FOUND_NO_IPI"

    return None, None, None, "NOT_FOUND"

def check_isrc(isrc):
    """Returns True if ISRC has recordings in MusicBrainz (implies PRO-registered works)."""
    if not isrc:
        return False
    data = mb_get("/recording/", {"query": f"isrc:{isrc}", "limit": 3})
    return bool(data and data.get("recordings"))

def send_nudge_email(to_email, artist_name, track_titles):
    if not SMTP_USER or not SMTP_PASS:
        log(f"  No SMTP config - skipping email to {to_email}")
        return
    track_list = "\n".join(f"  * {t}" for t in track_titles[:8])
    if len(track_titles) > 8:
        track_list += f"\n  ... and {len(track_titles)-8} more"
    body = f"""Hi {artist_name},

AI Artist Vault scanned your catalog and found that your tracks may not be registered with a PRO (ASCAP, BMI, or SESAC) yet.

This means you could be missing out on:
  * Performance royalties (radio, streaming, TV, venues)
  * Mechanical royalties
  * Sync licensing payments

Tracks we found that may be unregistered:
{track_list}

HOW TO REGISTER (free):
  * ASCAP: https://www.ascap.com/help/royalties-and-licensing/claiming-royalties
  * BMI:   https://www.bmi.com/creators/
  * SESAC: https://www.sesac.com/licensing/music-creators/

Once registered, add your IPI/CAE number to your Artist Vault profile so we can track your royalty status automatically.

Your vault: https://aiartistvault.com/vault

-- The AI Artist Vault Team
"""
    try:
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        msg = MIMEMultipart()
        msg["From"] = "AI Artist Vault <noreply@aiartistvault.com>"
        msg["To"] = to_email
        msg["Subject"] = f"Action needed: {artist_name} - your tracks may not be earning royalties"
        msg.attach(MIMEText(body, "plain"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
        log(f"  Nudge email sent to {to_email}")
    except Exception as e:
        log(f"  Email failed to {to_email}: {e}")

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
        SELECT ap.id as pid, ap.name, u.id as uid, u.email
        FROM ArtistProfile ap
        JOIN User u ON ap.ownerUserId = u.id
        WHERE ap.ownerUserId IS NOT NULL
        ORDER BY ap.createdAt
    """)
    artists = [dict(r) for r in cur.fetchall()]
    log(f"Checking {len(artists)} artists for PRO registration...")

    summary = {"registered": [], "not_registered": [], "unknown": []}

    for a in artists:
        name, email, uid, pid = a["name"], a["email"], a["uid"], a["pid"]
        log(f"\nChecking: {name} ({email})")

        ipi, isni, mb_id, mb_status = check_artist_pro(name)
        log(f"  MB status: {mb_status} | IPI: {ipi} | MB_ID: {mb_id}")

        # ISRC cross-check if name lookup was inconclusive
        isrc_hit = False
        if not ipi:
            cur.execute("""
                SELECT t.isrc, t.title FROM Track t
                JOIN Release r ON t.releaseId = r.id
                WHERE r.artistId = ? AND t.isrc IS NOT NULL AND t.isrc != ''
                LIMIT 3
            """, (pid,))
            for tr in cur.fetchall():
                if check_isrc(tr["isrc"]):
                    isrc_hit = True
                    log(f"  ISRC {tr['isrc']} found in MusicBrainz!")
                    break

        # Final verdict
        if ipi or isrc_hit:
            final = "APPROVED"
            notes = f"IPI: {ipi or 'via ISRC'} | ISNI: {isni} | MBID: {mb_id}"
            summary["registered"].append(name)
            log(f"  RESULT: Registered (PRO confirmed)")
        elif mb_status == "NOT_FOUND" and not isrc_hit:
            final = "NOT_STARTED"
            notes = "Not found in MusicBrainz. No ISRC matches. Needs PRO registration."
            summary["not_registered"].append({"name": name, "email": email, "pid": pid})
            log(f"  RESULT: Not registered - needs action")
        else:
            final = "UNKNOWN"
            notes = f"Found in MB (id: {mb_id}) but no IPI. May be on a different PRO."
            summary["unknown"].append(name)
            log(f"  RESULT: Uncertain")

        # Upsert ProRegistration
        cur.execute("SELECT id FROM ProRegistration WHERE userId=? AND org='ASCAP' AND trackId IS NULL", (uid,))
        existing = cur.fetchone()
        now = datetime.datetime.utcnow().isoformat()
        if existing:
            cur.execute("UPDATE ProRegistration SET status=?, notes=?, updatedAt=? WHERE id=?",
                        (final, notes, now, existing["id"]))
        else:
            cur.execute("""
                INSERT INTO ProRegistration (id, userId, org, status, notes, createdAt, updatedAt)
                VALUES (?,?,'ASCAP',?,?,?,?)
            """, (secrets.token_hex(12), uid, final, notes, now, now))
        conn.commit()

        # Email if unregistered and has tracks
        if final == "NOT_STARTED":
            cur.execute("""
                SELECT t.title FROM Track t JOIN Release r ON t.releaseId=r.id WHERE r.artistId=?
            """, (pid,))
            tracks = [r["title"] for r in cur.fetchall()]
            if tracks:
                send_nudge_email(email, name, tracks)

    conn.close()

    log("\n====== PRO REGISTRATION SUMMARY ======")
    log(f"  Registered:     {len(summary['registered'])} -> {summary['registered']}")
    log(f"  NOT registered: {len(summary['not_registered'])}")
    for r in summary["not_registered"]:
        log(f"    - {r['name']} ({r['email']})")
    log(f"  Unknown:        {len(summary['unknown'])} -> {summary['unknown']}")

if __name__ == "__main__":
    main()
