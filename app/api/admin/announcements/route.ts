import { supabaseAnnouncementsAdmin } from "@/lib/supabaseAnnouncementsAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const { error } = await supabaseAnnouncementsAdmin
    .from("announcements")
    .insert(body);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const filePath = searchParams.get("filePath");

    if (!id) {
      return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
    }

    // Delete file from storage if it exists
    if (filePath) {
      // Extract filename from filePath (format: timestamp-filename)
      const fileName = filePath.split("/").pop();
      if (fileName) {
        await supabaseAnnouncementsAdmin.storage
          .from("announcements-images")
          .remove([fileName]);
      }
    }

    // Delete announcement from database
    const { error } = await supabaseAnnouncementsAdmin
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete announcement" }, { status: 500 });
  }
}
