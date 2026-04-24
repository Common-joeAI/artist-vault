import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listUploads, saveUploadedFile, deleteUpload } from "@/lib/uploads";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uploads = await listUploads(session.userId);
  return NextResponse.json({ uploads });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const category = String(formData.get("category") ?? "misc") as any;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const upload = await saveUploadedFile(file, category, session.userId);
    return NextResponse.json({ upload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    const status = /invalid|not allowed|blocked|too large/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await deleteUpload(id, session.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
