"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm transition",
        "hover:bg-muted/50 active:scale-[0.99]",
        active ? "bg-muted/60 text-foreground" : "text-muted-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
        toast.error("Auth init failed");
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      if (mounted) setReady(true);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
      else setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    toast.message("Signed out");
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-2xl px-2 py-1 transition hover:bg-muted/40 active:scale-[0.99]"
          >
            <span className="text-lg font-semibold tracking-tight">
              tambo planner
            </span>
            <span className="rounded-full bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
              hack
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <NavLink href="/">Chat</NavLink>
            <NavLink href="/calendar">Calendar</NavLink>
            <NavLink href="/billing">Billing</NavLink>
            <NavLink href="/profile">Profile</NavLink>

            <Button
              variant="ghost"
              onClick={logout}
              className="h-9 rounded-full px-3 transition active:scale-[0.99]"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}