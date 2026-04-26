-- AlterTable: ArtistProfile — add slug, isPublic, location, website
ALTER TABLE "ArtistProfile" ADD COLUMN "slug" TEXT;
ALTER TABLE "ArtistProfile" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ArtistProfile" ADD COLUMN "location" TEXT;
ALTER TABLE "ArtistProfile" ADD COLUMN "website" TEXT;

-- CreateIndex for slug uniqueness
CREATE UNIQUE INDEX "ArtistProfile_slug_key" ON "ArtistProfile"("slug");

-- CreateTable: StyleDna
CREATE TABLE "StyleDna" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "artistId" TEXT NOT NULL,
  "topGenres" TEXT,
  "topMoods" TEXT,
  "topThemes" TEXT,
  "topTools" TEXT,
  "bpmRange" TEXT,
  "energyProfile" TEXT,
  "soundsLike" TEXT,
  "summary" TEXT,
  "tags" TEXT,
  "lastComputedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "StyleDna_artistId_key" ON "StyleDna"("artistId");
CREATE INDEX "StyleDna_artistId_idx" ON "StyleDna"("artistId");

-- CreateTable: CollabPost
CREATE TABLE "CollabPost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "artistId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'SEEKING',
  "role" TEXT NOT NULL,
  "genres" TEXT,
  "moods" TEXT,
  "tools" TEXT,
  "contactMethod" TEXT,
  "contactValue" TEXT,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "CollabPost_artistId_createdAt_idx" ON "CollabPost"("artistId", "createdAt");
CREATE INDEX "CollabPost_isOpen_createdAt_idx" ON "CollabPost"("isOpen", "createdAt");
CREATE INDEX "CollabPost_type_createdAt_idx" ON "CollabPost"("type", "createdAt");
