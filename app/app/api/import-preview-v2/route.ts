import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildEnhancedImportPreview } from "@/lib/advanced-imports";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { urls?: string[] };
    const urls = (body.urls ?? []).map((url) => url.trim()).filter(Boolean);

    if (!urls.length) {
      return NextResponse.json({ error: "Provide at least one URL to scan." }, { status: 400 });
    }

    const settled = await Promise.allSettled(urls.map((url) => buildEnhancedImportPreview(url)));
    const previews = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    const errors = settled.flatMap((result) => (result.status === "rejected" ? [result.reason instanceof Error ? result.reason.message : "Import failed."] : []));

    return NextResponse.json({ previews, errors });
  } catch {
    return NextResponse.json({ error: "Unable to run advanced import preview." }, { status: 500 });
  }
}
