import { supabaseAnnouncementsAdmin } from "@/lib/supabaseAnnouncementsAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const MAX_ANNOUNCEMENTS = 13;

/**
 * Enforce max-13 rule: if total active announcements exceed 13,
 * delete the oldest ones to bring count back to 13.
 */
async function enforceAnnouncementLimit() {
  if (!supabaseAnnouncementsAdmin?.from) return;

  // Count total active announcements
  const { data: allRows, error: countError } = await supabaseAnnouncementsAdmin
    .from("announcements")
    .select("id, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (countError || !allRows) return;

  if (allRows.length > MAX_ANNOUNCEMENTS) {
    // Delete oldest rows to bring count back to MAX_ANNOUNCEMENTS
    const toDelete = allRows.slice(0, allRows.length - MAX_ANNOUNCEMENTS);
    const idsToDelete = toDelete.map((r: any) => r.id);

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabaseAnnouncementsAdmin
        .from("announcements")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("Failed to enforce announcement limit:", deleteError);
      }
    }
  }
}

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const pending = url.searchParams.get('pending') === 'true';
  const approved = url.searchParams.get('approved') === 'true';

  let query = supabaseAnnouncementsAdmin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (pending) {
    query = query.eq("is_active", false);
  } else if (approved) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: data || [] });
}

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

  const body = await req.json();

  const { error } = await supabaseAnnouncementsAdmin
    .from("announcements")
    .insert(body);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // After inserting, enforce the 13-announcement limit
  await enforceAnnouncementLimit();

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
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

  // After approving (setting is_active=true), enforce limit
  if (is_active) {
    await enforceAnnouncementLimit();
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
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
