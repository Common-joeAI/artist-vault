#!/usr/bin/env python3
"""
Lyrics Video Generator v2 for Artist Vault
- Fetches artwork from iTunes API using Apple Music URL
- Uses lyricsText from DB, falls back to Genius scrape
- Generates full-length TikTok portrait MP4 (1080x1920)
- Saves lyricsVideoUrl back to Track record
"""

import sqlite3, subprocess, os, sys, json, re, requests, tempfile, shutil, time
from pathlib import Path

DB_PATH = "/opt/containers/artist-vault/data/dev.db"
MASTERS_DIR = "/opt/containers/artist-vault/data/uploads/masters"
OUTPUT_DIR = "/opt/containers/artist-vault/data/uploads/lyrics_videos"
GENIUS_TOKEN = os.environ.get("GENIUS_API_TOKEN", "")
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

os.makedirs(OUTPUT_DIR, exist_ok=True)


def get_tracks_needing_video(limit=10):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("""
        SELECT t.id, t.title, t.isrc, t.masterFileUrl, t.lyricsText, t.lyricsSource,
               t.streamingLinksJson, t.durationSeconds,
               r.coverArtUrl, r.title as releaseTitle,
               ap.name as artistName, u.email as artistEmail
        FROM Track t
        JOIN Release r ON t.releaseId = r.id
        JOIN ArtistProfile ap ON r.artistId = ap.id
        JOIN User u ON ap.ownerUserId = u.id
        WHERE (t.lyricsVideoUrl IS NULL OR t.lyricsVideoUrl = '')
        AND t.masterFileUrl IS NOT NULL AND t.masterFileUrl != ''
        LIMIT ?
    """, (limit,))
    tracks = [dict(r) for r in cur.fetchall()]
    conn.close()
    return tracks


def find_local_master(isrc):
    """Find master file by ISRC prefix in masters dir"""
    if not isrc:
        return None
    for f in os.listdir(MASTERS_DIR):
        if isrc.upper() in f.upper():
            return os.path.join(MASTERS_DIR, f)
    return None


def get_audio_duration(audio_path):
    result = subprocess.run([
        "ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", audio_path
    ], capture_output=True, text=True, timeout=30)
    try:
        data = json.loads(result.stdout)
        for s in data.get("streams", []):
            if s.get("codec_type") == "audio":
                return float(s.get("duration", 0))
    except:
        pass
    return 0


def get_artwork_from_apple_url(apple_url, tmpdir, isrc):
    """Fetch high-res artwork from iTunes API using album ID in Apple Music URL"""
    try:
        # Extract album ID from URL like https://music.apple.com/us/album/title/1234567?i=xxx
        m = re.search(r'/album/[^/]+/(\d+)', apple_url)
        if not m:
            return None
        album_id = m.group(1)
        api_url = f"https://itunes.apple.com/lookup?id={album_id}&entity=song"
        res = requests.get(api_url, timeout=10)
        data = res.json()
        results = data.get("results", [])
        for r in results:
            art = r.get("artworkUrl100", "")
            if art:
                # Upgrade to 1080x1080
                art_hd = art.replace("100x100bb", "1080x1080bb")
                img_res = requests.get(art_hd, timeout=15)
                out = os.path.join(tmpdir, f"{isrc}_art.jpg")
                with open(out, 'wb') as f:
                    f.write(img_res.content)
                return out
    except Exception as e:
        print(f"  Artwork fetch failed: {e}")
    return None


def fetch_lyrics_genius(artist_name, track_title):
    """Scrape lyrics from Genius"""
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        search_url = f"https://api.genius.com/search?q={requests.utils.quote(f'{track_title} {artist_name}')}"
        if GENIUS_TOKEN:
            headers["Authorization"] = f"Bearer {GENIUS_TOKEN}"
            res = requests.get(search_url, headers=headers, timeout=10)
        else:
            # Try scraping search without token
            res = requests.get(
                f"https://genius.com/api/search/song?q={requests.utils.quote(f'{track_title} {artist_name}')}",
                headers=headers, timeout=10
            )
        data = res.json()
        hits = (data.get("response", {}).get("hits", []) or 
                data.get("response", {}).get("sections", [{}])[0].get("hits", []))
        if not hits:
            return None
        
        url = hits[0].get("result", {}).get("url") or hits[0].get("result", {}).get("path")
        if not url:
            return None
        if not url.startswith("http"):
            url = f"https://genius.com{url}"
        
        page = requests.get(url, headers=headers, timeout=10)
        containers = re.findall(r'data-lyrics-container="true"[^>]*>(.*?)</div>', page.text, re.DOTALL)
        if not containers:
            return None
        raw = " ".join(containers)
        raw = re.sub(r'<br\s*/?>', '\n', raw)
        raw = re.sub(r'<[^>]+>', '', raw)
        raw = re.sub(r'\[.*?\]', '', raw)
        raw = re.sub(r'\n{3,}', '\n\n', raw).strip()
        return raw if len(raw) > 50 else None
    except Exception as e:
        print(f"  Genius failed: {e}")
        return None


def make_black_bg(tmpdir, isrc):
    out = os.path.join(tmpdir, f"{isrc}_art.jpg")
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", "color=c=0x1a1a2e:size=1080x1080:rate=1",
        "-frames:v", "1", out
    ], capture_output=True)
    return out


def wrap_text(text, max_chars=30):
    lines = []
    for line in text.split('\n'):
        line = line.strip()
        if not line:
            lines.append('')
            continue
        while len(line) > max_chars:
            bp = line.rfind(' ', 0, max_chars)
            if bp == -1: bp = max_chars
            lines.append(line[:bp])
            line = line[bp:].strip()
        if line:
            lines.append(line)
    return lines


def generate_video(track, tmpdir):
    title = track['title']
    artist = track['artistName']
    isrc = track['isrc'] or ''
    
    print(f"\n{'='*50}")
    print(f"  {artist} - {title}  [{isrc}]")

    # --- Audio ---
    audio_path = find_local_master(isrc)
    if not audio_path and track.get('masterFileUrl'):
        url = track['masterFileUrl']
        if url.startswith('/uploads/') or url.startswith('/opt/'):
            resolved = url if url.startswith('/opt/') else f"/opt/containers/artist-vault/data{url}"
            if os.path.exists(resolved):
                audio_path = resolved
        elif url.startswith('http'):
            audio_path = os.path.join(tmpdir, f"{isrc or 'track'}.mp3")
            r = requests.get(url, timeout=60)
            with open(audio_path, 'wb') as f: f.write(r.content)
    
    if not audio_path or not os.path.exists(audio_path):
        print(f"  No audio found, skipping")
        return None

    duration = get_audio_duration(audio_path)
    if duration < 5:
        print(f"  Bad duration ({duration}s), skipping")
        return None
    print(f"  Duration: {duration:.1f}s")

    # --- Artwork ---
    artwork_path = None
    links = {}
    if track.get('streamingLinksJson'):
        try: links = json.loads(track['streamingLinksJson'])
        except: pass
    
    if track.get('coverArtUrl'):
        try:
            r = requests.get(track['coverArtUrl'], timeout=15)
            artwork_path = os.path.join(tmpdir, f"{isrc}_art.jpg")
            with open(artwork_path, 'wb') as f: f.write(r.content)
        except: pass
    
    if not artwork_path and links.get('appleMusic'):
        artwork_path = get_artwork_from_apple_url(links['appleMusic'], tmpdir, isrc)
    
    if not artwork_path:
        artwork_path = make_black_bg(tmpdir, isrc)
    print(f"  Artwork: {'found' if artwork_path else 'none'}")

    # --- Lyrics ---
    lyrics = (track.get('lyricsText') or '').strip()
    if not lyrics:
        print(f"  No DB lyrics, trying Genius...")
        lyrics = fetch_lyrics_genius(artist, title)
        if lyrics:
            print(f"  Got Genius lyrics ({len(lyrics)} chars)")
        else:
            print(f"  No lyrics found, using title card")
            lyrics = f"{title}"
    else:
        print(f"  DB lyrics: {len(lyrics)} chars")

    # --- Build lyrics file ---
    wrapped = wrap_text(lyrics, max_chars=28)
    lf = os.path.join(tmpdir, f"{isrc}_lyrics.txt")
    with open(lf, 'w', encoding='utf-8') as f:
        f.write('\n'.join(wrapped))

    lines_total = max(len(wrapped), 1)
    # Scroll: text starts below screen, scrolls up over full duration + buffer
    scroll_px = lines_total * 72 + 1920
    lf_esc = lf.replace('\\', '\\\\').replace(':', '\\:').replace("'", "\\'")
    
    title_esc = title[:40].replace("'", "\\'").replace(':', '\\:')
    artist_esc = artist[:40].replace("'", "\\'").replace(':', '\\:')

    out_path = os.path.join(OUTPUT_DIR, f"{isrc}_lyrics_video.mp4")

    clip_duration = min(duration, 30.0)
    vf = (
        f"scale=1080:1080:force_original_aspect_ratio=decrease,"
        f"pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,"
        f"drawbox=x=0:y=0:w=iw:h=ih:color=black@0.5:t=fill,"
        f"drawtext=text='{artist_esc}':fontfile={FONT_BOLD}:fontsize=44:fontcolor=white"
        f":x=(w-text_w)/2:y=60:shadowcolor=black:shadowx=2:shadowy=2,"
        f"drawtext=text='{title_esc}':fontfile={FONT_REG}:fontsize=34:fontcolor=gold"
        f":x=(w-text_w)/2:y=118:shadowcolor=black:shadowx=2:shadowy=2,"
        f"drawtext=textfile='{lf_esc}':fontfile={FONT_REG}:fontsize=48:fontcolor=white"
        f":x=(w-text_w)/2:y=h-{scroll_px}*(t/{clip_duration:.3f})+h*0.4"
        f":shadowcolor=black@0.8:shadowx=3:shadowy=3:line_spacing=18,"
        f"drawtext=text='Full track @ aiartistvault.com':fontfile={FONT_REG}:fontsize=30:fontcolor=white@0.9"
        f":x=(w-text_w)/2:y=h-70:shadowcolor=black@0.9:shadowx=2:shadowy=2:enable='gte(t,20)'"
    )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", artwork_path,
        "-i", audio_path,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "192k",
        "-t", str(clip_duration),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-shortest",
        out_path
    ]

    print(f"  Generating video...")
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        print(f"  FFmpeg error:\n{r.stderr[-1500:]}")
        return None

    size_mb = os.path.getsize(out_path) / 1024 / 1024
    print(f"  Done: {out_path} ({size_mb:.1f} MB)")
    return out_path


def save_to_db(track_id, video_path):
    rel = video_path.replace("/opt/containers/artist-vault/data/uploads/", "/uploads/")
    url = f"https://aiartistvault.com{rel}"
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "UPDATE Track SET lyricsVideoUrl=?, updatedAt=? WHERE id=?",
        (url, int(time.time()*1000), track_id)
    )
    conn.commit()
    conn.close()
    return url


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    print(f"Lyrics Video Generator v2 — processing up to {limit} tracks")
    tracks = get_tracks_needing_video(limit)
    print(f"Found {len(tracks)} tracks needing lyrics videos")
    if not tracks:
        print("Nothing to do!")
        return

    tmpdir = tempfile.mkdtemp()
    ok, fail = 0, 0
    try:
        for t in tracks:
            try:
                vp = generate_video(t, tmpdir)
                if vp:
                    url = save_to_db(t['id'], vp)
                    print(f"  Saved: {url}")
                    ok += 1
                else:
                    fail += 1
            except Exception as e:
                print(f"  ERROR: {e}")
                fail += 1
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    print(f"\nDONE: {ok} generated, {fail} failed")


if __name__ == "__main__":
    main()
