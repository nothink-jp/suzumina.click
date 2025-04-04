import { auth } from "@/auth";

export function middleware() {
  auth();
}

// Node.js Runtimeを指定
export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#runtime
  runtime: "nodejs",
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
