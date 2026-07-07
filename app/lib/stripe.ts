import Stripe from "stripe";

// Stripe is initialized lazily so the app boots even without keys set yet.
// Set STRIPE_SECRET_KEY in your .env to activate payments.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
export const APP_URL = process.env.NEXTAUTH_URL ?? "https://aiartistvault.com";
