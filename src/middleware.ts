import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const envPassword = process.env.COMICFORGE_PASSWORD;

  // If no password configured, allow all requests
  if (!envPassword) {
    return NextResponse.next();
  }

  // Allow auth API routes (login check and status)
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow login page
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get("comicforge_auth");
  if (authCookie?.value === "true") {
    return NextResponse.next();
  }

  // For API routes, return 401
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // For page routes, redirect to login
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
