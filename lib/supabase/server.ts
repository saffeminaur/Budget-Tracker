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
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});
