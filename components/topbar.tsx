"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Chat", href: "/chat" },
  { label: "Calendar", href: "/calendar" },
  { label: "Billing", href: "/billing" },
  { label: "Profile", href: "/profile" },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="font-semibold tracking-tight">tambo planner</div>

          <nav className="ml-2 flex items-center gap-1 rounded-full bg-muted/40 p-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-full px-3 py-1.5 text-sm text-muted-foreground transition",
                    active && "bg-background text-foreground shadow-sm"
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary/40" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <Button variant="secondary" className="rounded-full" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}