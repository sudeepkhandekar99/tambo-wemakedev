"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // If already logged in, go straight to chat
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) router.replace("/chat");
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.replace("/chat");
    } else {
      setError("Login succeeded but no session was returned.");
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border bg-card/80 backdrop-blur p-6 shadow-sm">
          <div className="mb-6">
            <div className="font-display text-3xl tracking-tight">Welcome back</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Log in to start planning with Tambo.
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-foreground/90">Email</label>
              <input
                className="w-full rounded-2xl border bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-foreground/90">Password</label>
              <input
                className="w-full rounded-2xl border bg-background/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border bg-muted/40 px-4 py-3 text-sm text-foreground">
                <div className="font-medium">Couldn’t log in</div>
                <div className="mt-1 text-muted-foreground">{error}</div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <div className="mt-5 text-sm text-muted-foreground">
            Don’t have an account?{" "}
            <Link className="text-foreground underline underline-offset-4" href="/signup">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}