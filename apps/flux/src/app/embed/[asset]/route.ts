import { GET as embedGet } from '../../embed.js/route';
import type { NextRequest } from 'next/server';

const STABLE_HASH = 'c8b5f1a4';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ asset: string }> },
) {
  const { asset } = await context.params;
  if (asset !== `v1.${STABLE_HASH}.js`) {
    return Response.redirect(new URL(`/embed/v1.${STABLE_HASH}.js`, req.url), 302);
  }
  return withImmutableHeaders(embedGet(req));
}

function withImmutableHeaders(response: Response) {
  const next = new Response(response.body, response);
  next.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  next.headers.set('X-Triage-Embed-Version', `v1.${STABLE_HASH}`);
  return next;
}
