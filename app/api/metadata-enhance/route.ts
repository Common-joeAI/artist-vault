import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enhanceMetadata, RawReleaseInput } from "@/lib/metadata-enhancer";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RawReleaseInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body must be a release metadata object" }, { status: 400 });
  }

  try {
    const enhanced = await enhanceMetadata(body);
    return NextResponse.json({ ok: true, enhanced });
  } catch (err: any) {
    console.error("Metadata enhance error:", err);
    return NextResponse.json({ error: err.message ?? "Enhancement failed" }, { status: 500 });
  }
}
