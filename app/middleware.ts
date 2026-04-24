import { NextRequest, NextResponse } from "next/server";

function move(request: NextRequest, target: string) {
  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = "";
  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/vault/studio" || pathname === "/vault/phase-3" || pathname === "/vault/phase-4") {
    return move(request, "/vault/pro/home");
  }

  if (pathname === "/vault/press-kit" || pathname === "/vault/studio/press-kit") {
    return move(request, "/vault/pro/press-kit");
  }

  if (pathname === "/vault/releases/new" || pathname === "/vault/studio/releases/new") {
    return move(request, "/vault/pro/releases/new");
  }

  const releaseEdit = pathname.match(/^\/vault\/(?:studio\/)?releases\/([^/]+)\/edit$/);
  if (releaseEdit) {
    return move(request, "/vault/pro/releases/" + releaseEdit[1] + "/edit");
  }

  const trackNew = pathname.match(/^\/vault\/(?:studio\/)?releases\/([^/]+)\/tracks\/new$/);
  if (trackNew) {
    return move(request, "/vault/pro/releases/" + trackNew[1] + "/tracks/new");
  }

  const trackEdit = pathname.match(/^\/vault\/(?:studio\/)?releases\/([^/]+)\/tracks\/([^/]+)\/edit$/);
  if (trackEdit) {
    return move(request, "/vault/pro/releases/" + trackEdit[1] + "/tracks/" + trackEdit[2] + "/edit");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/vault/:path*"],
};
