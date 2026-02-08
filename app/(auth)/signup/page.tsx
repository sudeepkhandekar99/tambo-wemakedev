"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // NOTE: If your Supabase auth is configured for email confirmations,
    // user might need to confirm before login. Still fine for hackathon.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    setLoading(false);

    if (error) return toast.error(error.message);

    if (data.session) {
      toast.success("Account created");
      router.push("/chat");
      return;
    }

    toast.success("Check your email to confirm your account");
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[520px] soft-card p-8 md:p-10">
        <div className="text-sm font-medium tracking-tight">
          <span className="px-3 py-1 rounded-full border bg-white/70">
            tambo planner
          </span>
        </div>

        <h1 className="mt-7 text-4xl md:text-5xl font-semibold font-display">
          Create your account
        </h1>
        <p className="mt-2 prose-subtle">
          Start planning your days with calm, intentional structure.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <div className="text-xs prose-subtle">Name</div>
            <div className="soft-input px-4 py-2">
              <Input
                className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          </div>

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
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full soft-button"
          >
            {loading ? "Creating..." : "Sign up"}
          </Button>

          <div className="pt-2 text-sm prose-subtle">
            Already have an account?{" "}
            <Link className="link-subtle" href="/login">
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}