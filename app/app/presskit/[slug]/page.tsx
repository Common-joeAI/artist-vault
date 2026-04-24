import { db } from "@/lib/db";

export default async function PublicPressKitSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const pressKit = await db.pressKit.findUnique({
    where: { slug },
    include: {
      artist: {
        include: {
          releases: {
            include: { tracks: true },
          },
        },
      },
    },
  });

  if (!pressKit || !pressKit.isPublic) {
    return <div style={{ padding: "2rem" }}>Press kit not found.</div>;
  }

  const profile = pressKit.artist;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1>{profile.name}</h1>

      {pressKit.heroImageUrl && (
        <img
          src={pressKit.heroImageUrl}
          alt={profile.name}
          style={{ width: "220px", borderRadius: "16px" }}
        />
      )}

      <p>{pressKit.shortBio || profile.bio}</p>

      <h2>Releases</h2>

      {profile.releases.map((release) => (
        <div key={release.id} style={{ marginBottom: "2rem" }}>
          {release.coverArtUrl && (
            <img
              src={release.coverArtUrl}
              alt={release.title}
              style={{ width: "140px", borderRadius: "12px" }}
            />
          )}

          <h3>{release.title}</h3>

          {release.tracks.map((track) => (
            <div key={track.id}>
              <strong>{track.title}</strong>
              {track.audioPreviewUrl && <audio controls src={track.audioPreviewUrl} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
