import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ProSchema = z.object({
  proOrg: z.enum(["ASCAP", "BMI", "SESAC", "NONE"]),
  writerId: z.string().max(30).nullable().optional(),
  publisherId: z.string().max(30).nullable().optional(),
  ipiNumber: z.string().max(20).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ProSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { proOrg, writerId, publisherId, ipiNumber } = parsed.data;

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      proOrg,
      proWriterId: writerId ?? null,
      proPublisherId: publisherId ?? null,
      ipiNumber: ipiNumber ?? null,
      proSetupComplete: true,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      proOrg: true,
      proWriterId: true,
      proPublisherId: true,
      ipiNumber: true,
      proSetupComplete: true,
    },
  });

  return NextResponse.json(user ?? { proOrg: null, proSetupComplete: false });
}
