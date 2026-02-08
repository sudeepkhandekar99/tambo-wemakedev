"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      toast.error(error.message);
      return;
    }

    const user = data.user;

    // Create profile + subscription (best effort)
    if (user) {
      await Promise.all([
        supabase.from("profiles").upsert({
          id: user.id,
          name,
          avatar_color: "#e9d5ff", // soft pastel
        }),
        supabase.from("subscriptions").upsert({
          user_id: user.id,
          plan: "trial",
          status: "trialing",
          tokens_monthly_limit: 5000,
          tokens_used: 0,
          trial_ends_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }),
      ]);
    }

    setLoading(false);
    toast.success("Account created ✨");

    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
        <Card className="w-full rounded-3xl border bg-card/60 p-6 shadow-sm backdrop-blur">
          <div className="mb-6">
            <div className="text-2xl font-semibold tracking-tight">
              Create your account
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Start planning your days with Tambo.
            </div>
          </div>

          <form action={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Tam Boo"
                required
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="h-11 rounded-2xl"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border bg-muted/40 px-3 py-2 text-sm">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full rounded-2xl transition active:scale-[0.99]"
              disabled={loading}
            >
              {loading ? "Creating…" : "Sign up"}
            </Button>

            <p className="pt-2 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="text-primary underline-offset-4 hover:underline" href="/login">
                Log in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}