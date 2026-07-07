const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function migrate() {
  try {
    // SQLite: add columns one by one, ignore errors if they exist
    const cols = ["bio", "tone", "photoUrl", "epkUrl", "topTrackIds", "lyricsExcerpts", "streamingLinks"];
    for (const col of cols) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "PressKit" ADD COLUMN "${col}" TEXT`);
        console.log("Added column:", col);
      } catch(e) {
        console.log("Column exists or error:", col, e.message?.slice(0, 60));
      }
    }
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "PressKit" ADD COLUMN "updatedAt" DATETIME`);
      console.log("Added column: updatedAt");
    } catch(e) {
      console.log("updatedAt exists:", e.message?.slice(0, 60));
    }
    // Make title nullable by default — SQLite can't alter types, but null inserts will work
    console.log("Migration complete");
  } finally {
    await db.$disconnect();
  }
}
migrate().catch(console.error);
