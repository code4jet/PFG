import { supabaseAnnouncementsAdmin } from "@/lib/supabaseAnnouncementsAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  if (!supabaseAnnouncementsAdmin?.from) {
    return NextResponse.json(
      { error: "Announcements admin client is not configured." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAnnouncementsAdmin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(req: Request) {
  if (!supabaseAnnouncementsAdmin?.from) {
    return NextResponse.json(
      { error: "Announcements admin client is not configured." },
      { status: 500 }
    );
  }

  const body = await req.json();

  const { error } = await supabaseAnnouncementsAdmin
    .from("announcements")
    .insert(body);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  if (!supabaseAnnouncementsAdmin?.from) {
    return NextResponse.json(
      { error: "Announcements admin client is not configured." },
      { status: 500 }
    );
  }

  const { id, is_active } = await req.json();
  if (!id || typeof is_active !== "boolean") {
    return NextResponse.json(
      { error: "Missing required fields: id, is_active" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAnnouncementsAdmin
    .from("announcements")
    .update({ is_active })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  if (!supabaseAnnouncementsAdmin?.from) {
    return NextResponse.json(
      { error: "Announcements admin client is not configured." },
      { status: 500 }
    );
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing required field: id" }, { status: 400 });
  }

  const { error } = await supabaseAnnouncementsAdmin
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
