import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CLUB_SCREEN_PATHS, clubSlugFromHost, effectiveClubSlug, isBareLocalHost } from "@/lib/tenant";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host");
  const pinned = request.cookies.get("skys_club")?.value;
  const hostSlug = clubSlugFromHost(host);
  const allowPin = isBareLocalHost(host) && pathname !== "/login" && !pathname.startsWith("/platform") && !pathname.startsWith("/api");
  const slug = allowPin ? effectiveClubSlug(host, pinned) : hostSlug;
  const headers = new Headers(request.headers);
  headers.set("x-club-slug", slug);
  const prefix = `/c/${slug}`;
  const visible = pathname === prefix ? "/" : pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
  headers.set("x-pathname", visible);
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next({ request: { headers } });
  }
  if (pathname.startsWith("/platform") || pathname === "/login") {
    return NextResponse.next({ request: { headers } });
  }

  // /c/... is the real route. Sending it back to "/" loops, because "/" is rewritten here.
  if (pathname.startsWith("/c/")) {
    return NextResponse.next({ request: { headers } });
  }
  if (pathname === "/kulup-sec") {
    return NextResponse.redirect(new URL(`/${search}`, request.url));
  }

  const url = request.nextUrl.clone();
  const screen = pathname.split("/").filter(Boolean)[0];
  if (pathname === "/") {
    url.pathname = prefix;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  if (screen && CLUB_SCREEN_PATHS.includes(screen)) {
    url.pathname = `${prefix}${pathname}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
