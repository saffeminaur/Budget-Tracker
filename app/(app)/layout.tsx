import { requireUser } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";
import { BottomNav } from "@/components/bottom-nav";
import { UserBadge } from "@/components/user-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const customName = (user.user_metadata?.display_name as string | undefined)?.trim();
  const emailPrefix = user.email?.split("@")[0] ?? "there";
  const fallbackName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  const displayName = customName || fallbackName;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span className="min-w-0 truncate text-sm font-semibold">
          Femina Budget Tracker
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <UserBadge
            displayName={displayName}
            email={user.email ?? ""}
            hasCustomName={!!customName}
          />
          <ThemeToggle />
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
