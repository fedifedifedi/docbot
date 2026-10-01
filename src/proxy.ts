import { NextResponse, type NextRequest } from "next/server";
import { adminRedirect } from "@/lib/auth/admin-routes";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";

/** Optimistic auth check for /admin/*: cookie signature only, no database access. */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  const session = secret ? await verifySessionToken(token, secret) : null;

  const target = adminRedirect(request.nextUrl.pathname, session !== null);
  return target ? NextResponse.redirect(new URL(target, request.url)) : NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
