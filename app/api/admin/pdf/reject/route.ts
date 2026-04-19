import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!cookieStore.get("admin_session")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, filePath } = await req.json();

  await supabaseAdmin.storage.from("pdfs").remove([filePath]);
  await supabaseAdmin.from("pdfs").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
