// Same-origin proxy to the API server, for self-hosted installs.
//
// A self-hosted build sets NEXT_PUBLIC_API_URL=/api/v1 and API_INTERNAL_URL
// (e.g. http://server:4000) at runtime, so one client image works on any
// domain: the browser only ever talks to this app, and this handler forwards
// /api/v1/* to the API container — cookies stay first-party, and there's no
// API URL to bake in at build time. Hosted production points
// NEXT_PUBLIC_API_URL straight at the API and never reaches this handler
// (it 404s when API_INTERNAL_URL is unset).

// Hop-by-hop and length headers that must not be copied across a proxy.
const DROP_REQUEST_HEADERS = ["host", "connection", "content-length", "transfer-encoding", "keep-alive", "upgrade"];
// fetch() already decoded the body, so the upstream encoding/length no longer apply.
const DROP_RESPONSE_HEADERS = ["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"];

async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const upstreamBase = process.env.API_INTERNAL_URL;
  if (!upstreamBase) return new Response("Not found", { status: 404 });

  const { path } = await params;
  const incoming = new URL(request.url);
  const target = new URL(`/api/v1/${path.map(encodeURIComponent).join("/")}${incoming.search}`, upstreamBase);

  const headers = new Headers(request.headers);
  for (const name of DROP_REQUEST_HEADERS) headers.delete(name);
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Passes OAuth redirects back to the browser instead of following them here.
      redirect: "manual",
      // Required to stream a request body (uploads) through fetch.
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit);
  } catch {
    return Response.json(
      { success: false, data: null, error: { code: "API_UNREACHABLE", message: "The API server isn't reachable." } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const name of DROP_RESPONSE_HEADERS) responseHeaders.delete(name);
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
}

export const dynamic = "force-dynamic";

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS, proxy as HEAD };
