import { requireUser } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span className="text-sm text-muted-foreground truncate">
          {user.email}
        </span>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </form>
      </header>
      <main className="flex-1 px-4 py-4 pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
