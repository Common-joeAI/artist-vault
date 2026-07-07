import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TsvRow {
  saleMonth: string;
  store: string;
  artist: string;
  title: string;
  isrc: string;
  upc: string;
  quantity: number;
  songAlbum: string;
  earnings: number;
}

function parseTsv(text: string): TsvRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map(h =>
    h.trim().toLowerCase().replace(/[\s\/\(\)]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")
  );

  const idx = (...names: string[]) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i !== -1) return i;
    }
    for (const n of names) {
      const i = headers.findIndex(h => h.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const col = {
    saleMonth: idx("sale_month"),
    store: idx("store"),
    artist: idx("artist"),
    title: idx("title"),
    isrc: idx("isrc"),
    upc: idx("upc"),
    quantity: idx("quantity"),
    songAlbum: idx("song_album"),
    earnings: idx("earnings_usd", "earnings"),
  };

  const rows: TsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split("\t");
    if (cells.length < 5) continue;
    const g = (c: number) => (c >= 0 && c < cells.length ? (cells[c] ?? "").trim() : "");
    const title = g(col.title);
    if (!title) continue;
    rows.push({
      saleMonth: g(col.saleMonth),
      store: g(col.store),
      artist: g(col.artist),
      title,
      isrc: g(col.isrc),
      upc: g(col.upc),
      quantity: parseInt(g(col.quantity), 10) || 0,
      songAlbum: g(col.songAlbum),
      earnings: parseFloat(g(col.earnings)) || 0,
    });
  }
  return rows;
}

interface AggSong {
  title: string;
  isrc: string;
  upc: string;
  artist: string;
  stores: Set<string>;
  totalStreams: number;
  totalEarnings: number;
  saleMonths: Set<string>;
  releaseType: string;
}

function aggregateRows(rows: TsvRow[]): AggSong[] {
  const map = new Map<string, AggSong>();
  for (const r of rows) {
    const key = r.isrc || `${r.title.toLowerCase()}__${r.upc}`;
    if (!map.has(key)) {
      map.set(key, {
        title: r.title, isrc: r.isrc, upc: r.upc, artist: r.artist,
        stores: new Set(), totalStreams: 0, totalEarnings: 0,
        saleMonths: new Set(),
        releaseType: r.songAlbum?.toLowerCase() === "album" ? "ALBUM" : "SINGLE",
      });
    }
    const s = map.get(key)!;
    s.stores.add(r.store);
    s.totalStreams += r.quantity;
    s.totalEarnings += r.earnings;
    s.saleMonths.add(r.saleMonth);
  }
  return [...map.values()];
}

export async function POST(request: NextRequest) {
  try {
    // getSession() returns { userId, email, role } directly
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await (file as Blob).text();
    const rows = parseTsv(text);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found — make sure this is a DistroKid TSV" }, { status: 400 });
    }

    const songs = aggregateRows(rows);

    const user = await db.user.findUnique({ where: { email: session.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const profile = await db.artistProfile.findFirst({ where: { ownerUserId: user.id } });
    if (!profile) {
      return NextResponse.json({
        error: "No artist profile found. Please complete onboarding first.",
      }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const song of songs) {
      try {
        const existingRelease = await db.release.findFirst({
          where: { artistId: profile.id, title: song.title },
          include: { tracks: true },
        });

        if (existingRelease) {
          if (song.isrc) {
            const existingTrack = existingRelease.tracks.find(
              (t: { isrc: string | null }) => t.isrc === song.isrc
            );
            if (existingTrack) {
              await db.track.update({
                where: { id: existingTrack.id },
                data: {
                  proNotes: `Streams: ${song.totalStreams} | Earnings: $${song.totalEarnings.toFixed(4)} | Stores: ${[...song.stores].join(", ")}`,
                },
              });
              updated++;
              continue;
            }
          }
          await db.track.create({
            data: {
              releaseId: existingRelease.id,
              title: song.title,
              trackNumber: 1,
              isrc: song.isrc || null,
              proNotes: `Streams: ${song.totalStreams} | Earnings: $${song.totalEarnings.toFixed(4)} | Stores: ${[...song.stores].join(", ")} | DistroKid TSV`,
            },
          });
          updated++;
          continue;
        }

        const newRelease = await db.release.create({
          data: {
            artistId: profile.id,
            title: song.title,
            releaseType: song.releaseType,
            distributor: "DistroKid",
            notes: `DistroKid TSV | Streams: ${song.totalStreams} | Earnings: $${song.totalEarnings.toFixed(4)} | Stores: ${[...song.stores].join(", ")} | Months: ${[...song.saleMonths].join(", ")}`,
          },
        });

        await db.track.create({
          data: {
            releaseId: newRelease.id,
            title: song.title,
            trackNumber: 1,
            isrc: song.isrc || null,
            proNotes: `Streams: ${song.totalStreams} | Earnings: $${song.totalEarnings.toFixed(4)} | Stores: ${[...song.stores].join(", ")}`,
          },
        });

        imported++;
      } catch (e) {
        errors.push(`"${song.title}": ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      ok: true,
      totalRows: rows.length,
      uniqueSongs: songs.length,
      imported,
      updated,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}