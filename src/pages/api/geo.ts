import type { APIRoute } from 'astro';

// Make ONLY this route a Vercel serverless function; the rest of the site stays static.
export const prerender = false;

// The home page is prerendered, so the client cannot read a request header itself.
// This is the smallest possible endpoint that hands it back the one header Vercel
// attaches at the edge, so the language can follow the country a visitor is in and
// not only the language their phone happens to be set to.
export const GET: APIRoute = ({ request }) => {
  const country =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    null;

  return new Response(JSON.stringify({ country }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Per visitor, and cheap to recompute: never let a CDN pin one country for everyone.
      'cache-control': 'no-store',
    },
  });
};
