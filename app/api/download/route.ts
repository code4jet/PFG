import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const filename = searchParams.get('filename') ?? 'download';
  const inline = searchParams.get('inline') === 'true';

  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const fileRes = await fetch(url);
  if (!fileRes.ok) {
    const text = await fileRes.text();
    return NextResponse.json(
      { error: `Failed to fetch file: ${fileRes.status} ${text}` },
      { status: fileRes.status }
    );
  }

  const buffer = await fileRes.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}.pdf"`,
    },
  });
}
