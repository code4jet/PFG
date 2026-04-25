import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  
  if (password === process.env.ADMIN_PASSWORD) {
    const res = NextResponse.json({ success: true });
    res.cookies.set({
      name: 'admin_session',
      value: 'true',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8,
      path: '/',  // THIS IS CRITICAL - cookie must be set for all paths
    });
    return res;
  }
  
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('admin_session');
  return res;
}
