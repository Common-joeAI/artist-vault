export async function GET() {
  return Response.json({ ok: true, service: "artist-vault", timestamp: new Date().toISOString() });
}
