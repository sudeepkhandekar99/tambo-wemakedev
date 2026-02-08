"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) return toast.error(error.message);

    toast.success("Welcome back");
    router.push("/chat");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[520px] soft-card p-8 md:p-10">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium tracking-tight">
            <span className="px-3 py-1 rounded-full border bg-white/70">
              tambo planner
            </span>
          </div>
          <div className="text-xs prose-subtle">Calm, focused planning</div>
        </div>

        <h1 className="mt-7 text-4xl md:text-5xl font-semibold font-display">
          Welcome back
        </h1>
        <p className="mt-2 prose-subtle">
          Log in to start planning your days with Tambo.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <div className="text-xs prose-subtle">Email</div>
            <div className="soft-input px-4 py-2">
              <Input
                className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs prose-subtle">Password</div>
            <div className="soft-input px-4 py-2">
              <Input
                className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full soft-button"
          >
            {loading ? "Logging in..." : "Log in"}
          </Button>

          <div className="pt-2 text-sm prose-subtle">
            Don’t have an account?{" "}
            <Link className="link-subtle" href="/signup">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}