import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerApiBase } from './lib/api-base';

export async function middleware(request: NextRequest) {
  const api = getServerApiBase();
  const cookie = request.headers.get('cookie') ?? '';
  let res: Response;
  try {
    res = await fetch(`${api}/api/v1/auth/get-session`, {
      headers: { cookie },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (!res.ok) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
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
