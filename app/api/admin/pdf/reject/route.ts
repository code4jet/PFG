import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!cookieStore.get("admin_session")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  // WHY: We no longer store files in Supabase Storage.
  // file_path now contains the full Google Drive link or Cloudinary URL.
  // So we only need to delete the database record.
  const { error } = await supabaseAdmin.from("pdfs").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
