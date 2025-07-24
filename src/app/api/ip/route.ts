// app/api/ip/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  let ip = forwardedFor?.split(',')[0]?.trim() || 'Unknown';

  // Remove IPv6 prefix if present
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  return NextResponse.json({ ip });
}
