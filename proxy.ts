import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanics, new name).
// This runs on every request to refresh the Supabase session cookie and
// redirect unauthenticated users away from protected pages. It's an
// optimistic check only — every Server Action and page also re-verifies the
// session itself (see lib/supabase/server.ts requireUser), and Row Level
// Security is the real data boundary. Per Next's own guidance, Proxy should
// avoid slow checks (it runs on every request, including prefetches), so
// this uses getClaims() — a local JWT signature check against a cached
// JWKS — instead of getUser(), which always makes a network call to the
// Supabase Auth server.
export default async function proxy(request: NextRequest) {
  // API routes handle their own auth (session cookies for browser-called
  // ones, a shared secret for server-to-server ones like
  // /api/ingest-email) and should never get redirected to /login — a
  // JSON caller has no use for an HTML redirect, and an unattended caller
  // like the ingest endpoint's Apps Script has no session cookie at all.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const authenticated = !!data?.claims;

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!authenticated && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authenticated && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
