import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SELF_HOSTED } from "@/lib/instance";

// Pages that only make sense for the hosted product. A self-hosted install
// doesn't serve them: each one sends the visitor into the app instead.
const HOSTED_ONLY = ["/about", "/blog", "/changelog", "/community", "/features", "/pricing", "/vs", "/waitlist", "/contact"];

const ACCESS_TOKEN_COOKIE = "savedly_access_token";

function isHostedOnly(pathname: string): boolean {
  return pathname === "/" || HOSTED_ONLY.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  if (!SELF_HOSTED || !isHostedOnly(request.nextUrl.pathname)) return NextResponse.next();
  // Only picks where to land. Whether someone may see the app is decided by
  // the app itself, which sends an expired session on to sign-in.
  const signedIn = request.cookies.has(ACCESS_TOKEN_COOKIE);
  return NextResponse.redirect(new URL(signedIn ? "/app" : "/auth/login", request.url));
}

export const config = {
  // Pages only: not the API, Next's own files, or anything with a file extension.
  matcher: ["/((?!api/|_next/|.*\\.[\\w]+$).*)"],
};
