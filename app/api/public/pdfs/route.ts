import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const docType = searchParams.get("doc_type");

  if (!docType) {
    return NextResponse.json({ error: "doc_type is required" }, { status: 400 });
  }

  // Bypass RLS to allow public users to fetch their approved files
  const { data, error } = await supabaseAdmin
    .from("pdfs")
    .select("*")
    .eq("status", "approved")
    .eq("doc_type", docType)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: data || [] });
}
