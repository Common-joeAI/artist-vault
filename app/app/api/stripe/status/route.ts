import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ isPaid: false });
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { isPaid: true, subscriptionStatus: true, subscriptionEndsAt: true },
  });
  return NextResponse.json(user ?? { isPaid: false });
}
