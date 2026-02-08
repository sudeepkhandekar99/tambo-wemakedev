"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "relative rounded-full px-3 py-1.5 text-sm transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {label}
      {active ? (
        <span className="pointer-events-none absolute left-3 right-3 -bottom-1 h-[2px] rounded-full bg-foreground/70" />
      ) : null}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }
      setEmail(session.user.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) router.replace("/login");
      else setEmail(session.user.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="font-display text-lg tracking-tight">tambo planner</div>
            <div className="hidden sm:flex items-center gap-1 rounded-full bg-muted/40 px-2 py-1">
              <NavLink href="/chat" label="Chat" />
              <NavLink href="/calendar" label="Calendar" />
              <NavLink href="/billing" label="Billing" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="rounded-full bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {email ? email.split("@")[0] : "Profile"}
            </Link>
            <button
              onClick={logout}
              className="rounded-full bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors active:scale-[0.99]"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden border-t">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
            <NavLink href="/chat" label="Chat" />
            <NavLink href="/calendar" label="Calendar" />
            <NavLink href="/billing" label="Billing" />
          </div>
        </div>
      </header>

      {/* Page */}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}