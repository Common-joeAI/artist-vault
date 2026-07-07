import { NextResponse } from "next/server";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { db } from "@/lib/db";
import Stripe from "stripe";

export async function POST(request: Request) {
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const stripe = getStripe();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // userId is stored in session.metadata (set during checkout creation)
      const userId = session.metadata?.userId;
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
      if (!userId || !subscriptionId) break;

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end;
      await db.user.update({
        where: { id: userId },
        data: {
          isPaid: true,
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status,
          subscriptionEndsAt: new Date(periodEnd * 1000),
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      const isActive = ["active", "trialing"].includes(sub.status);
      const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end;
      await db.user.update({
        where: { id: userId },
        data: {
          isPaid: isActive,
          subscriptionStatus: sub.status,
          stripeSubscriptionId: sub.id,
          subscriptionEndsAt: new Date(periodEnd * 1000),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await db.user.update({
        where: { id: userId },
        data: {
          isPaid: false,
          subscriptionStatus: "canceled",
          stripeSubscriptionId: null,
          subscriptionEndsAt: null,
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
