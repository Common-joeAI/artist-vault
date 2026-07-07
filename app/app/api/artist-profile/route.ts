import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — list profiles for current user
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profiles = await db.artistProfile.findMany({
    where: { ownerUserId: session.userId },
    include: { links: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ profiles });
}

// POST — create a new profile (gated by isPaid)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { isPaid: true },
  });

  const existingCount = await db.artistProfile.count({
    where: { ownerUserId: session.userId },
  });

  // Free users capped at 1 profile
  if (!user?.isPaid && existingCount >= 1) {
    return NextResponse.json(
      { error: "UPGRADE_REQUIRED", message: "Free accounts are limited to 1 artist profile. Upgrade to Pro for unlimited profiles." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const profile = await db.artistProfile.create({
    data: {
      name: body.name ?? "New Artist Profile",
      bio: body.bio ?? null,
      photoUrl: body.photoUrl ?? null,
      ownerUser: { connect: { id: session.userId } },
    },
  });

  return NextResponse.json({ profile });
}
