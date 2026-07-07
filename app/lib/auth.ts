/**
 * auth.ts  -  Multi-tenant authentication for Artist Vault
 *
 * Features:
 * - Public signup with email verification
 * - Role-based access (artist | radio_station | admin)
 * - Password reset flow
 * - Secure scrypt hashing, HMAC-signed session cookies
 */

import { Prisma } from "@prisma/client";
import { createHmac, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const SESSION_COOKIE_NAME = "artist_vault_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const VERIFY_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;  // 24 hours
const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;         // 1 hour

export type UserRole = "artist" | "radio_station" | "admin";

type SessionPayload = {
  userId: string;
  email: string;
  role: UserRole;
  expiresAt: number;
};

// ─────────────────────────────────────────────
// Crypto helpers
// ─────────────────────────────────────────────

const encode = (v: string) => Buffer.from(v, "utf-8").toString("base64url");
const decode = (v: string) => Buffer.from(v, "base64url").toString("utf-8");
const secret = () => process.env.ARTIST_VAULT_SESSION_SECRET?.trim() ?? "";
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function makeHash(password: string, salt?: string) {
  const s = salt ?? randomBytes(16).toString("hex");
  return `scrypt$${s}$${scryptSync(password, s, 64).toString("hex")}`;
}

function verifyHash(password: string, hash: string) {
  const [scheme, salt, value] = hash.split("$");
  if (scheme !== "scrypt" || !salt || !value) return false;
  const computed = scryptSync(password, salt, 64).toString("hex");
  return safeEqual(computed, value);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

// ─────────────────────────────────────────────
// Session management
// ─────────────────────────────────────────────

function createSessionToken(payload: SessionPayload) {
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !secret()) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig || !safeEqual(sig, sign(encoded))) return null;
  try {
    const payload = JSON.parse(decode(encoded)) as SessionPayload;
    if (!payload.userId || !payload.email || !payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(user: { id: string; email: string; role: UserRole }) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      expiresAt: Date.now() + SESSION_TTL_MS,
    }),
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    },
  );
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(role: UserRole): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== role && session.role !== "admin") {
    redirect("/vault");
  }
  return session;
}

export async function redirectIfAuthenticated() {
  const session = await getSession();
  if (session) {
    if (session.role === "radio_station") redirect("/radio/dashboard");
    redirect("/vault");
  }
}

// ─────────────────────────────────────────────
// Signup
// ─────────────────────────────────────────────

export async function createUserAccount(
  email: string,
  password: string,
  options: { name?: string; role?: UserRole } = {}
) {
  const lowered = normalizeEmail(email);

  if (!lowered || !lowered.includes("@")) {
    throw new Error("Enter a valid email address.");
  }
  if (password.trim().length < 8) {
    throw new Error("Use at least 8 characters for your password.");
  }

  const verifyToken = generateToken();

  try {
    const user = await db.user.create({
      data: {
        email: lowered,
        passwordHash: makeHash(password),
        name: options.name?.trim() || null,
        role: options.role ?? "artist",
        emailVerified: false,
        emailVerifyToken: verifyToken,
      },
    });

    return { user, verifyToken };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("An account with that email already exists.");
    }
    throw error;
  }
}

// ─────────────────────────────────────────────
// Email verification
// ─────────────────────────────────────────────

export async function verifyEmail(token: string) {
  const user = await db.user.findFirst({
    where: { emailVerifyToken: token },
  });

  if (!user) throw new Error("Invalid or expired verification link.");

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null },
  });

  return user;
}

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────

export async function authenticateUser(email: string, password: string) {
  const lowered = normalizeEmail(email);

  // DB users
  const user = await db.user.findUnique({ where: { email: lowered } });
  if (user && verifyHash(password, user.passwordHash)) {
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      emailVerified: user.emailVerified,
    };
  }

  // Env-based admin fallback (for initial setup)
  const envEmail = process.env.ARTIST_VAULT_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const envHash = process.env.ARTIST_VAULT_ADMIN_PASSWORD_HASH?.trim() ?? "";
  const envPlain = process.env.ARTIST_VAULT_ADMIN_PASSWORD?.trim() ?? "";
  const passwordOk = envHash ? verifyHash(password, envHash) : password === envPlain;

  if (lowered === envEmail && passwordOk) {
    // Upsert admin in DB so they get a real userId
    const adminUser = await db.user.upsert({
      where: { email: lowered },
      create: {
        email: lowered,
        passwordHash: envHash || makeHash(envPlain),
        role: "admin",
        emailVerified: true,
      },
      update: {},
    });

    return {
      id: adminUser.id,
      email: adminUser.email,
      role: "admin" as UserRole,
      emailVerified: true,
    };
  }

  return null;
}

// ─────────────────────────────────────────────
// Password reset
// ─────────────────────────────────────────────

export async function initiatePasswordReset(email: string) {
  const lowered = normalizeEmail(email);
  const user = await db.user.findUnique({ where: { email: lowered } });

  // Always return success to prevent email enumeration
  if (!user) return { token: null, email: lowered };

  const token = generateToken();
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  });

  return { token, email: lowered };
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.trim().length < 8) {
    throw new Error("Use at least 8 characters for your new password.");
  }

  const user = await db.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) throw new Error("Invalid or expired reset link.");

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: makeHash(newPassword),
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  return user;
}

// ─────────────────────────────────────────────
// PRO org enforcement
// ─────────────────────────────────────────────

export async function setProOrg(userId: string, org: "ASCAP" | "BMI") {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  if (user.proOrg && user.proOrg !== org) {
    throw new Error(
      `You are already registered with ${user.proOrg}. An artist cannot belong to both ASCAP and BMI.`
    );
  }

  await db.user.update({ where: { id: userId }, data: { proOrg: org } });
}

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

export function getAuthConfigurationError() {
  if (!secret()) return "Missing ARTIST_VAULT_SESSION_SECRET.";
  return null;
}
