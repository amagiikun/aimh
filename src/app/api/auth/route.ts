import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const envPassword = process.env.COMICFORGE_PASSWORD;

  // If no password set, auth is not required
  if (!envPassword) {
    return NextResponse.json({ authenticated: true });
  }

  if (password === envPassword) {
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set("comicforge_auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return response;
  }

  return NextResponse.json(
    { authenticated: false, error: "密码错误" },
    { status: 401 },
  );
}

export async function GET() {
  const envPassword = process.env.COMICFORGE_PASSWORD;
  return NextResponse.json({ required: !!envPassword });
}
