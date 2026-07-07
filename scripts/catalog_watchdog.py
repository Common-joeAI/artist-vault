import sqlite3, json, urllib.request, urllib.parse, time, base64, os
from datetime import datetime

DB = '/opt/containers/artist-vault/data/dev.db'
LOG = '/opt/containers/artist-vault/data/watchdog_log.json'
GMAIL_TOKEN_FILE = '/opt/containers/artist-vault/data/gmail_token.txt'

def get_gmail_token():
    if os.path.exists(GMAIL_TOKEN_FILE):
        with open(GMAIL_TOKEN_FILE) as f:
            return f.read().strip()
    return None

def send_email(token, to_email, artist_name, new_releases):
    if not token:
        print(f"  No Gmail token, skipping email to {to_email}")
        return
    
    release_lines = ""
    for rel in new_releases[:5]:
        release_lines += f"  • {rel['title']} ({rel['type']}) — {rel['date'] or 'date unknown'} [{rel['source']}]\n"
    
    subject = f"New release discovered in your catalog — please verify"
    body = f"""Hey {artist_name},

Our catalog watchdog picked up some releases associated with your name that aren't in your Artist Vault yet:

{release_lines}
To keep your vault complete and release-ready, please log in and verify these are yours — and import any missing tracks:

👉 https://aiartistvault.com/vault/import

If these aren't your releases, no worries — just ignore this email and we'll refine our search.

Having your full catalog in the vault means:
- Your press kit stays current automatically
- You're ready to push to new platforms instantly
- Metadata is preserved even if a distributor drops your release

Talk soon,
Bennett
AI Artist Vault — https://aiartistvault.com
"""
    mime = f"From: bennettjoseph99@gmail.com\r\nTo: {to_email}\r\nSubject: {subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n{body}"
    raw = base64.urlsafe_b64encode(mime.encode()).decode().rstrip("=")
    data = json.dumps({"raw": raw}).encode()
    req = urllib.request.Request(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            resp = json.loads(r.read())
            print(f"  ✅ Email sent to {to_email} — id:{resp.get('id','?')}")
    except Exception as e:
        print(f"  ❌ Email failed to {to_email}: {e}")

def search_itunes_full(artist_name):
    """Get full metadata from iTunes including tracks"""
    results = []
    query = urllib.parse.quote(artist_name)
    
    # Search albums
    url = f"https://itunes.apple.com/search?term={query}&media=music&entity=album&limit=15&sort=recent"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ArtistVault/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            for item in data.get('results', []):
                results.append({
                    "source": "iTunes",
                    "title": item.get('collectionName', '').strip(),
                    "type": item.get('collectionType', 'Album'),
                    "date": item.get('releaseDate', '')[:10],
                    "url": item.get('collectionViewUrl', ''),
                    "artwork": item.get('artworkUrl100', '').replace('100x100', '3000x3000'),
                    "genre": item.get('primaryGenreName', ''),
                    "artist": item.get('artistName', ''),
                    "track_count": item.get('trackCount', 0),
                    "label": item.get('copyright', ''),
                    "itunes_id": item.get('collectionId', ''),
                    "upc": item.get('upc', ''),
                    "explicit": item.get('collectionExplicitness', ''),
                    "country": item.get('country', '')
                })
    except Exception as e:
        print(f"  iTunes album error: {e}")
    
    time.sleep(0.3)
    
    # Also search individual tracks/singles
    url2 = f"https://itunes.apple.com/search?term={query}&media=music&entity=musicTrack&limit=15&sort=recent"
    try:
        req = urllib.request.Request(url2, headers={"User-Agent": "ArtistVault/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            seen = set(r['title'].lower() for r in results)
            for item in data.get('results', []):
                title = item.get('trackName', '').strip()
                collection = item.get('collectionName', title)
                if collection.lower() not in seen:
                    results.append({
                        "source": "iTunes",
                        "title": collection,
                        "type": "Single",
                        "date": item.get('releaseDate', '')[:10],
                        "url": item.get('trackViewUrl', ''),
                        "artwork": item.get('artworkUrl100', '').replace('100x100', '3000x3000'),
                        "genre": item.get('primaryGenreName', ''),
                        "artist": item.get('artistName', ''),
                        "track_count": 1,
                        "label": item.get('copyright', ''),
                        "itunes_id": item.get('trackId', ''),
                        "isrc": item.get('isrc', ''),
                        "explicit": item.get('trackExplicitness', ''),
                        "preview_url": item.get('previewUrl', ''),
                        "duration_ms": item.get('trackTimeMillis', 0),
                        "bpm": None,
                        "country": item.get('country', '')
                    })
                    seen.add(collection.lower())
    except Exception as e:
        print(f"  iTunes track error: {e}")
    
    return results

def search_deezer_full(artist_name):
    results = []
    query = urllib.parse.quote(artist_name)
    
    # Find artist ID first for accuracy
    url = f"https://api.deezer.com/search/artist?q={query}&limit=5"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ArtistVault/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            artists = data.get('data', [])
            # Find closest name match
            match = None
            for a in artists:
                if a.get('name','').lower() == artist_name.lower():
                    match = a
                    break
            if not match and artists:
                match = artists[0]
            
            if match:
                artist_id = match['id']
                # Get discography
                disco_url = f"https://api.deezer.com/artist/{artist_id}/albums?limit=20"
                req2 = urllib.request.Request(disco_url, headers={"User-Agent": "ArtistVault/1.0"})
                with urllib.request.urlopen(req2, timeout=10) as r2:
                    disco = json.loads(r2.read())
                    for item in disco.get('data', []):
                        results.append({
                            "source": "Deezer",
                            "title": item.get('title', '').strip(),
                            "type": item.get('record_type', 'album').title(),
                            "date": item.get('release_date', ''),
                            "url": item.get('link', ''),
                            "artwork": item.get('cover_xl', item.get('cover_big', '')),
                            "genre": '',
                            "artist": artist_name,
                            "track_count": item.get('nb_tracks', 0),
                            "label": item.get('label', ''),
                            "upc": item.get('upc', ''),
                            "explicit": 'explicit' if item.get('explicit_lyrics') else 'clean',
                            "fans": match.get('nb_fan', 0)
                        })
    except Exception as e:
        print(f"  Deezer error: {e}")
    
    return results

def search_musicbrainz_full(artist_name):
    results = []
    query = urllib.parse.quote(f'artist:"{artist_name}"')
    url = f"https://musicbrainz.org/ws/2/release/?query={query}&limit=10&fmt=json"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ArtistVault/1.0 (bennettjoseph99@gmail.com)"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            for item in data.get('releases', []):
                label_info = item.get('label-info', [])
                label = label_info[0].get('label', {}).get('name', '') if label_info else ''
                results.append({
                    "source": "MusicBrainz",
                    "title": item.get('title', '').strip(),
                    "type": item.get('release-group', {}).get('primary-type', 'Release'),
                    "date": item.get('date', ''),
                    "url": f"https://musicbrainz.org/release/{item.get('id','')}",
                    "artwork": '',
                    "genre": '',
                    "artist": artist_name,
                    "track_count": item.get('track-count', 0),
                    "label": label,
                    "barcode": item.get('barcode', ''),
                    "country": item.get('country', ''),
                    "status": item.get('status', ''),
                    "mb_id": item.get('id', '')
                })
    except Exception as e:
        print(f"  MusicBrainz error: {e}")
    return results

def get_existing_releases(db, artist_profile_id):
    rows = db.execute("SELECT title FROM Release WHERE artistId = ?", (artist_profile_id,)).fetchall()
    return set(r[0].lower().strip() for r in rows)

def run_watchdog(send_emails=True):
    db = sqlite3.connect(DB)
    artists = db.execute(
        "SELECT ap.id, ap.name, u.email FROM ArtistProfile ap JOIN User u ON u.id = ap.ownerUserId"
    ).fetchall()

    gmail_token = get_gmail_token()
    results = []
    new_found = []

    for (pid, name, email) in artists:
        print(f"\nChecking: {name} <{email}>")
        existing = get_existing_releases(db, pid)
        discovered = []
        seen_titles = set()

        itunes = search_itunes_full(name)
        for item in itunes:
            t = item['title'].lower()
            if t and t not in existing and t not in seen_titles:
                discovered.append(item)
                seen_titles.add(t)
        time.sleep(0.3)

        deezer = search_deezer_full(name)
        for item in deezer:
            t = item['title'].lower()
            if t and t not in existing and t not in seen_titles:
                discovered.append(item)
                seen_titles.add(t)
        time.sleep(1)

        mb = search_musicbrainz_full(name)
        for item in mb:
            t = item['title'].lower()
            if t and t not in existing and t not in seen_titles:
                discovered.append(item)
                seen_titles.add(t)
        time.sleep(1)

        print(f"  Found {len(discovered)} new releases not in vault")

        if discovered:
            new_found.append({"artist": name, "email": email, "pid": pid, "releases": discovered})
            if send_emails:
                send_email(gmail_token, email, name, discovered)

        results.append({
            "artist": name,
            "checked": datetime.utcnow().isoformat(),
            "new_count": len(discovered),
            "new_releases": discovered[:10]
        })

    # Save detailed log
    with open(LOG, 'w') as f:
        json.dump({
            "last_run": datetime.utcnow().isoformat(),
            "results": results,
            "new_found": [{"artist": n["artist"], "email": n["email"], "count": len(n["releases"])} for n in new_found]
        }, f, indent=2)

    db.close()

    print(f"\n{'='*50}")
    print(f"SUMMARY: {len(new_found)} artists have releases not in vault")
    total_new = sum(len(n['releases']) for n in new_found)
    print(f"TOTAL NEW RELEASES FOUND: {total_new}")
    for nf in new_found:
        print(f"\n  {nf['artist']} ({len(nf['releases'])} releases):")
        for rel in nf['releases'][:3]:
            upc = rel.get('upc','')
            isrc = rel.get('isrc','')
            meta = f" UPC:{upc}" if upc else ""
            meta += f" ISRC:{isrc}" if isrc else ""
            meta += f" Label:{rel.get('label','')}" if rel.get('label') else ""
            print(f"    [{rel['source']}] {rel['title']} ({rel['type']}, {rel['date']}){meta}")

if __name__ == '__main__':
    import sys
    send_emails = '--no-email' not in sys.argv
    run_watchdog(send_emails=send_emails)
