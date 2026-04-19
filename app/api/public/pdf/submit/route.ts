import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, subject, semester, doc_type, file_path, status } = body;

    if (!title || !subject || !semester || !doc_type || !file_path) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("pdfs").insert({
      title,
      subject,
      semester,
      doc_type,
      file_path,
      status: "pending", // Force status to pending
      created_at: new Date().toISOString() // Explicitly set created_at for tables missing a default value
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
