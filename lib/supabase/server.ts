import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

// Server Component / Server Action client. Reads the session from cookies;
// writes are best-effort since Server Components can't set cookies (the
// proxy is responsible for refreshing the session cookie on every request).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — ignore, proxy refreshes the session.
          }
        },
      },
    }
  );
}

// Data Access Layer entry point: verifies the session and returns the user,
// redirecting to /login if there isn't one. Memoized per-request with
// React's cache() so calling it from multiple components/actions in the
// same render only checks once.
//
// Uses getClaims() rather than getUser(): both cryptographically verify the
// JWT, but getClaims() does it locally against a cached JWKS instead of
// making a network call to the Supabase Auth server on every single
// request (it only falls back to a network call if local verification
// isn't possible, e.g. a symmetric signing key) — see Next's Proxy/DAL
// guidance in node_modules/next/dist/docs/01-app/02-guides/authentication.md.
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const { claims } = data;
  return {
    id: claims.sub,
    email: claims.email as string | undefined,
    user_metadata: (claims.user_metadata as Record<string, unknown>) ?? {},
  };
});
