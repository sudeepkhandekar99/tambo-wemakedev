"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  timezone: string | null;
};

export default function ProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [email, setEmail] = React.useState<string>("");
  const [profile, setProfile] = React.useState<ProfileRow>({
    id: "",
    username: "",
    full_name: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
  });

  async function load() {
    setLoading(true);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      setLoading(false);
      toast.error("Not logged in");
      return;
    }

    setEmail(userData.user.email ?? "");

    // Try profiles table (optional). If it doesn't exist yet, we still render UI-only.
    const { data: row, error } = await supabase
      .from("profiles")
      .select("id,username,full_name,timezone")
      .eq("id", userData.user.id)
      .single();

    if (error) {
      // If table isn't there or row missing, just fallback to local UI state
      setProfile((p) => ({
        ...p,
        id: userData.user.id,
      }));
      setLoading(false);
      return;
    }

    setProfile({
      id: row?.id ?? userData.user.id,
      username: row?.username ?? "",
      full_name: row?.full_name ?? "",
      timezone: row?.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || ""),
    });

    setLoading(false);
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!profile.id) return;

    setSaving(true);

    // Upsert into profiles (if table exists)
    const { error } = await supabase.from("profiles").upsert({
      id: profile.id,
      username: profile.username?.trim() || null,
      full_name: profile.full_name?.trim() || null,
      timezone: profile.timezone?.trim() || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Profile saved");
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="font-display text-2xl tracking-tight">Profile</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Keep this minimal. Later we’ll feed timezone + preferences into Tambo context.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-[24px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="font-display text-lg">Account</CardTitle>
              <Badge variant="secondary" className="rounded-full">
                Supabase Auth
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} readOnly className="rounded-[18px]" />
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="rounded-full" onClick={load} disabled={loading}>
                Refresh
              </Button>
              <Button
                variant="destructive"
                className="rounded-full"
                onClick={async () => {
                  await supabase.auth.signOut();
                  toast.message("Signed out");
                  window.location.href = "/login";
                }}
              >
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Planner preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {/* <div className="space-y-2">
                <Label>Full name</Label>
                <Input
                  className="rounded-[18px]"
                  value={profile.full_name ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Your name"
                />
              </div> */}

              {/* <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  className="rounded-[18px]"
                  value={profile.username ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
                  placeholder="sudeep"
                />
              </div> */}

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  className="rounded-[18px]"
                  value={profile.timezone ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
                  placeholder="America/New_York"
                />
                <div className="text-xs text-muted-foreground">
                  Used by Tambo so your plans land at the right times.
                </div>
              </div>
            </div>

            <Button className="rounded-full" onClick={save} disabled={saving || loading}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}