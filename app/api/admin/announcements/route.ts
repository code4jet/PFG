import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json(
    { error: "Announcements backend is not configured (Supabase removed)." },
    { status: 501 }
  );
}

export async function DELETE(req: Request) {
  return NextResponse.json(
    { error: "Announcements backend is not configured (Supabase removed)." },
    { status: 501 }
  );
}
