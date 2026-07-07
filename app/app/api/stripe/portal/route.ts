import { NextResponse } from "next/server";
import { getStripe, APP_URL } from "@/lib/stripe";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = getStripe();
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${APP_URL}/vault/upgrade`,
  });

  return NextResponse.json({ url: portalSession.url });
}
