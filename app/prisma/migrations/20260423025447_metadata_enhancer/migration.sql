-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'misc',
    "relativePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" TEXT,
    CONSTRAINT "Upload_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArtistProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArtistProfile_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArtistLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtistLink_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "releaseType" TEXT NOT NULL DEFAULT 'SINGLE',
    "distributor" TEXT,
    "releaseDate" DATETIME,
    "coverArtUrl" TEXT,
    "spotifyUrl" TEXT,
    "appleMusicUrl" TEXT,
    "youtubeMusicUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Release_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "trackNumber" INTEGER,
    "isrc" TEXT,
    "lyrics" TEXT,
    "masterFileUrl" TEXT,
    "audioPreviewUrl" TEXT,
    "durationSeconds" INTEGER,
    "bpm" INTEGER,
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "ascapStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "bmiStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "ascapWorkId" TEXT,
    "bmiWorkId" TEXT,
    "writers" TEXT,
    "producers" TEXT,
    "splitNotes" TEXT,
    "enhancerStatus" TEXT NOT NULL DEFAULT 'queued',
    "enhancedAt" DATETIME,
    "lastEnhancementError" TEXT,
    "recognizedTitle" TEXT,
    "recognizedArtist" TEXT,
    "recognizedAlbum" TEXT,
    "recognizedLabel" TEXT,
    "recognizedReleaseDate" DATETIME,
    "upc" TEXT,
    "distributorName" TEXT,
    "distributionKnown" BOOLEAN,
    "distributionStatusText" TEXT,
    "streamingLinksJson" JSONB,
    "providerRawJson" JSONB,
    "aiEnhancedJson" JSONB,
    "lyricsText" TEXT,
    "lyricsStructuredJson" JSONB,
    "lyricsLrc" TEXT,
    "lyricsSrt" TEXT,
    "lyricsSource" TEXT,
    "lyricsConfidence" REAL,
    "ascapNotes" TEXT,
    "bmiNotes" TEXT,
    "humanAuthorshipFlagsJson" JSONB,
    "suggestedWriterSplitsJson" JSONB,
    "pressKitSuggestionsJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Track_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PressKit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "shortBio" TEXT,
    "longBio" TEXT,
    "heroImageUrl" TEXT,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PressKit_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetadataEnhancementJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "sourceFileName" TEXT,
    "sourceMimeType" TEXT,
    "sourceByteSize" INTEGER,
    "transcriptionProvider" TEXT,
    "aiModel" TEXT,
    "requestJson" JSONB,
    "resultJson" JSONB,
    "errorJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MetadataEnhancementJob_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Upload_category_uploadedAt_idx" ON "Upload"("category", "uploadedAt");

-- CreateIndex
CREATE INDEX "Upload_uploadedByUserId_uploadedAt_idx" ON "Upload"("uploadedByUserId", "uploadedAt");

-- CreateIndex
CREATE INDEX "ArtistProfile_ownerUserId_createdAt_idx" ON "ArtistProfile"("ownerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ArtistLink_artistId_platform_idx" ON "ArtistLink"("artistId", "platform");

-- CreateIndex
CREATE INDEX "Release_artistId_releaseDate_idx" ON "Release"("artistId", "releaseDate");

-- CreateIndex
CREATE INDEX "Track_releaseId_trackNumber_idx" ON "Track"("releaseId", "trackNumber");

-- CreateIndex
CREATE INDEX "Track_isrc_idx" ON "Track"("isrc");

-- CreateIndex
CREATE UNIQUE INDEX "PressKit_slug_key" ON "PressKit"("slug");

-- CreateIndex
CREATE INDEX "MetadataEnhancementJob_trackId_createdAt_idx" ON "MetadataEnhancementJob"("trackId", "createdAt");

-- CreateIndex
CREATE INDEX "MetadataEnhancementJob_status_createdAt_idx" ON "MetadataEnhancementJob"("status", "createdAt");
