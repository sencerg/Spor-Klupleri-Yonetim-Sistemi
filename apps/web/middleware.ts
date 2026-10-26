import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CLUB_SCREEN_PATHS, clubSlugFromHost } from "@/lib/tenant";

export function middleware(request: NextRequest) {
  const slug = clubSlugFromHost(request.headers.get("host"));
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set("x-club-slug", slug);
  headers.set("x-pathname", pathname);
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next({ request: { headers } });
  }

  const prefix = `/c/${slug}`;
  if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
    const next = pathname.slice(prefix.length) || "/";
    return NextResponse.redirect(new URL(`${next}${search}`, request.url));
  }
  if (pathname.startsWith("/c/") || pathname.startsWith("/platform") || pathname === "/kulup-sec") {
    return NextResponse.redirect(new URL("/", request.url));
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
