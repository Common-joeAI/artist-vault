import { Prisma } from "@prisma/client";
import { createHmac, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "artist_vault_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

type SessionPayload = {
  email: string;
  userId?: string;
  source: "db" | "env";
  expiresAt: number;
};

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

async function userCount() {
  try {
    return await db.user.count();
  } catch {
    return 0;
  }
}

export async function authenticateUser(email: string, password: string) {
  const lowered = normalizeEmail(email);
  const count = await userCount();

  if (count > 0) {
    const user = await db.user.findUnique({ where: { email: lowered } });
    if (user && verifyHash(password, user.passwordHash)) {
      return { email: user.email, userId: user.id, source: "db" as const };
    }
  }

  const envEmail = process.env.ARTIST_VAULT_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const envHash = process.env.ARTIST_VAULT_ADMIN_PASSWORD_HASH?.trim() ?? "";
  const envPlain = process.env.ARTIST_VAULT_ADMIN_PASSWORD?.trim() ?? "";
  const passwordOk = envHash ? verifyHash(password, envHash) : password === envPlain;

  if (lowered === envEmail && passwordOk) {
    return { email: envEmail, source: "env" as const };
  }

  return null;
}

export async function createUserAccount(email: string, password: string, name?: string) {
  const lowered = normalizeEmail(email);

  if (!lowered) {
    throw new Error("Enter a valid email address.");
  }

  if (password.trim().length < 8) {
    throw new Error("Use at least 8 characters for your password.");
  }

  try {
    return await db.user.create({
      data: { email: lowered, passwordHash: makeHash(password), name: name?.trim() || null },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("An account with that email already exists.");
    }

    throw error;
  }
}

export async function createFirstUser(email: string, password: string, name?: string) {
  if ((await userCount()) > 0) throw new Error("Users already exist.");
  return createUserAccount(email, password, name);
}

export function getAuthConfigurationError() {
  if (!secret()) return "Missing ARTIST_VAULT_SESSION_SECRET.";
  return null;
}

function createSessionToken(payload: SessionPayload) {
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

function verifySessionToken(token: string | undefined | null) {
  if (!token || !secret()) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig || !safeEqual(sig, sign(encoded))) return null;
  try {
    const payload = JSON.parse(decode(encoded)) as SessionPayload;
    if (!payload.email || !payload.expiresAt || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(identity: { email: string; userId?: string; source: "db" | "env" }) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    createSessionToken({ ...identity, expiresAt: Date.now() + SESSION_TTL_MS }),
    { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL_MS / 1000 },
  );
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function redirectIfAuthenticated() {
  const session = await getSession();
  if (session) redirect("/vault");
}
