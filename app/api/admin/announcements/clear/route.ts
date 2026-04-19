import { supabaseAnnouncementsAdmin } from "@/lib/supabaseAnnouncementsAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!cookieStore.get("admin_session")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseAnnouncementsAdmin?.from) {
    return NextResponse.json(
      { error: "Announcements admin client is not configured." },
      { status: 500 }
    );
  }

  await req.json().catch(() => ({}));

  // Hard delete all announcements. Your schema may not include `is_active`,
  // and the user's request is to remove past announcements completely.
  const { data: rows, error: listError } = await supabaseAnnouncementsAdmin
    .from("announcements")
    .select("id");

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 400 });
  }

  const ids = (rows || []).map((r: any) => r.id).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ success: true });
  }

  const { error: deleteError } = await supabaseAnnouncementsAdmin
    .from("announcements")
    .delete()
    .in("id", ids);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

