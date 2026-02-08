"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();

  const authReady = useAppStore((s) => (s as any).authReady ?? true); // safe if you didn't add authReady
  const session = useAppStore((s) => s.session);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // If already logged in, go to chat
  React.useEffect(() => {
    if (!authReady) return;
    if (session?.user) router.replace("/chat");
  }, [authReady, session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      toast.success("Welcome back ✨");
      // Providers will also update store, but we redirect immediately.
      if (data.session) router.replace("/chat");
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md rounded-3xl p-6 shadow-sm bg-card/70">
        <div className="mb-6">
          <div className="font-display text-3xl tracking-tight">Sign in</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Chat with Tambo to plan your life.
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-2xl"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <div className="pt-2 text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="text-foreground underline">
              Create an account
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}