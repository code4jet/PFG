import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json(
    { error: "PDF approval backend is not configured (Supabase removed)." },
    { status: 501 }
  );
}
