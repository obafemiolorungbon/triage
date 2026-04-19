import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerApiBase } from './lib/api-base';

export async function middleware(request: NextRequest) {
  const api = getServerApiBase();
  const cookie = request.headers.get('cookie') ?? '';
  const res = await fetch(`${api}/api/v1/auth/get-session`, {
    headers: { cookie },
    cache: 'no-store',
  });
  if (!res.ok) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  const data: unknown = await res.json();
  const hasSession =
    typeof data === 'object' &&
    data !== null &&
    ('session' in data || 'user' in data);
  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
