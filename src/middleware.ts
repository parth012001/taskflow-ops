import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Force password change - redirect to settings if user must change password
    // Allow access to settings, API routes, and logout
    if (token?.mustChangePassword) {
      const allowedPaths = ["/settings", "/api/", "/login"];
      const isAllowedPath = allowedPaths.some((p) => path.startsWith(p));

      if (!isAllowedPath) {
        return NextResponse.redirect(new URL("/settings?passwordChange=required", req.url));
      }
    }

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
