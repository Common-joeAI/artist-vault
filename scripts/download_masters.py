#!/usr/bin/env python3
"""
Artist Vault - Master Audio Downloader
Multi-tenant: downloads best-quality audio from YouTube for every
track missing a masterFileUrl, across all registered artists.
Usage: python3 download_masters.py [--user-id <id>] [--limit <n>] [--dry-run]
"""
import sqlite3, json, subprocess, os, re, time, urllib.request, urllib.parse, argparse, hashlib

DB     = '/opt/containers/artist-vault/data/dev.db'
STORE  = '/opt/containers/artist-vault/data/uploads/masters'
YTDLP  = os.path.expanduser('~/yt-dlp')
SERVE  = '/uploads/masters'

os.makedirs(STORE, exist_ok=True)

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 Chrome/124', 'Accept-Language': 'en-US'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.read().decode('utf-8', errors='replace')
    except:
        return None

def find_yt(title, artist, existing=None):
    if existing:
        return existing
    q = urllib.parse.quote(f'{title} {artist} audio')
    data = fetch(f'https://www.youtube.com/results?search_query={q}')
    if not data:
        return None
    ids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', data)
    return f'https://www.youtube.com/watch?v={ids[0]}' if ids else None

def dl(yt_url, out_tmpl):
    res = subprocess.run([
        YTDLP,
        '--format', 'bestaudio[ext=m4a]/bestaudio/best',
        '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
        '--no-playlist', '--no-progress', '--quiet',
        '-o', out_tmpl, yt_url
    ], capture_output=True, text=True, timeout=120)
    return res.returncode == 0, res.stderr

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--user-id', default=None)
    ap.add_argument('--limit', type=int, default=None)
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    conn = sqlite3.connect(DB)
    cur  = conn.cursor()

    sql = """
        SELECT t.id, t.title, t.isrc, t.streamingLinksJson,
               ap.name, u.email, u.id
        FROM Track t
        JOIN Release r   ON t.releaseId  = r.id
        JOIN ArtistProfile ap ON r.artistId = ap.id
        JOIN User u          ON ap.ownerUserId = u.id
        WHERE (t.masterFileUrl IS NULL OR t.masterFileUrl = '')
    """
    params = []
    if args.user_id:
        sql += " AND u.id = ?"; params.append(args.user_id)
    sql += " ORDER BY u.id, t.createdAt"
    if args.limit:
        sql += f" LIMIT {args.limit}"
    cur.execute(sql, params)
    tracks = cur.fetchall()
    print(f"Found {len(tracks)} tracks needing masters")

    done = failed = skipped = 0
    for track_id, title, isrc, links_json, artist, email, uid in tracks:
        links = {}
        try: links = json.loads(links_json) if links_json else {}
        except: pass

        safe  = re.sub(r'[^a-zA-Z0-9_-]', '_', title)[:50]
        fname = f"{isrc or hashlib.md5(title.encode()).hexdigest()[:8]}_{safe}"
        mp3   = os.path.join(STORE, f"{fname}.mp3")
        url   = f"{SERVE}/{fname}.mp3"

        print(f"\n[{done+failed+skipped+1}/{len(tracks)}] {artist} - {title} ({email})")

        if os.path.exists(mp3):
            cur.execute("UPDATE Track SET masterFileUrl=? WHERE id=?", (url, track_id))
            conn.commit()
            print(f"  already on disk -> updated DB")
            skipped += 1; continue

        yt = find_yt(title, artist, links.get('youtube'))
        if not yt:
            print(f"  no YouTube URL"); failed += 1; continue

        print(f"  src: {yt}")
        if args.dry_run:
            print(f"  [dry-run] -> {mp3}"); done += 1; continue

        ok, err = dl(yt, os.path.join(STORE, f"{fname}.%(ext)s"))
        if ok and os.path.exists(mp3):
            cur.execute("UPDATE Track SET masterFileUrl=? WHERE id=?", (url, track_id))
            conn.commit()
            mb = os.path.getsize(mp3)/1024/1024
            print(f"  saved {mb:.1f}MB -> {url}")
            done += 1
        else:
            print(f"  FAILED: {(err or '')[:100]}"); failed += 1
        time.sleep(1.5)

    conn.close()
    print(f"\nDone: {done} downloaded, {skipped} already on disk, {failed} failed")

if __name__ == '__main__':
    main()
