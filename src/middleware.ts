import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Manager-only routes
    if (path.startsWith("/manager")) {
      if (token?.role === "EMPLOYEE") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Admin-only routes
    if (path.startsWith("/admin")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api/auth (auth endpoints)
     * - login page
     * - static files
     * - public assets
     */
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
