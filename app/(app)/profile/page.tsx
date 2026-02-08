"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Goal = { id: string; text: string; enabled: boolean };

type TimeBlock = {
  id: string;
  label: string;
  days: string[]; // ["mon","tue"...]
  start: string; // "09:00"
  end: string; // "10:00"
  enabled: boolean;
};

type Preferences = {
  timezone?: string;
  goals?: Goal[];
  timeBlocks?: TimeBlock[];
};

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(16).slice(2);
}

function normalize(p: Preferences | null | undefined): Preferences {
  return {
    timezone:
      p?.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone ??
      "UTC",
    goals: Array.isArray(p?.goals) ? p!.goals! : [],
    timeBlocks: Array.isArray(p?.timeBlocks) ? p!.timeBlocks! : [],
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user?.id) throw new Error("Not logged in");
  return data.user.id;
}

export default function ProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [prefs, setPrefs] = React.useState<Preferences>(() =>
    normalize(undefined)
  );

  // Auto-save debounce (saves after user pauses typing/clicking)
  const [debouncedPrefs] = useDebounce(prefs, 450);

  // Track if we have loaded once (avoid writing defaults before fetch)
  const didLoadRef = React.useRef(false);

  async function load() {
    setLoading(true);
    try {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from("profiles")
        .select("preferences_json")
        .eq("id", userId)
        .single();

      if (error) throw new Error(error.message);

      setPrefs(normalize((data as any)?.preferences_json as Preferences));
      didLoadRef.current = true;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load profile");
      didLoadRef.current = true;
    } finally {
      setLoading(false);
    }
  }

  async function save(next: Preferences) {
    setSaving(true);
    try {
      const userId = await requireUserId();
      const { error } = await supabase
        .from("profiles")
        .update({ preferences_json: next })
        .eq("id", userId);

      if (error) throw new Error(error.message);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save on any change (after debounce)
  React.useEffect(() => {
    if (!didLoadRef.current) return;
    if (loading) return;
    save(debouncedPrefs);
  }, [debouncedPrefs]);

  // ---------- UI helpers ----------
  const goals = prefs.goals ?? [];
  const blocks = prefs.timeBlocks ?? [];

  function updateGoals(nextGoals: Goal[]) {
    setPrefs((p) => ({ ...p, goals: nextGoals }));
  }

  function updateBlocks(nextBlocks: TimeBlock[]) {
    setPrefs((p) => ({ ...p, timeBlocks: nextBlocks }));
  }

  function TogglePill({
    enabled,
    onToggle,
  }: {
    enabled: boolean;
    onToggle: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
          "hover:shadow-sm active:scale-[0.99]",
          enabled
            ? "bg-primary text-primary-foreground border-primary/40"
            : "bg-muted text-muted-foreground border-border"
        )}
        aria-pressed={enabled}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            enabled ? "bg-primary-foreground/90" : "bg-foreground/25"
          )}
        />
        {enabled ? "Active" : "Paused"}
      </button>
    );
  }

  function DayChip({
    selected,
    label,
    onClick,
  }: {
    selected: boolean;
    label: string;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition",
          "active:scale-[0.98]",
          selected
            ? "bg-[#F4B8A6]/40 text-[#7A3E2B] border border-[#F4B8A6]/70 shadow-sm"
            : "bg-transparent text-muted-foreground border border-border hover:bg-muted/60"
        )}
        aria-pressed={selected}
      >
        {label}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="font-display text-3xl tracking-tight">Profile</div>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Profile</h1>
            <p className="text-sm text-muted-foreground">
              Goals and availability rules that guide the AI planner.
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            {saving ? "Saving…" : "Saved"}
          </div>
        </div>
      </header>

      {/* Goals */}
      <section className="rounded-[28px] border bg-card/40 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Goals</h2>

          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              updateGoals([
                ...goals,
                { id: uid(), text: "Sleep by 10pm, wake at 5am", enabled: true },
              ]);
            }}
          >
            Add goal
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {goals.length === 0 ? (
            <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
              Add a goal like “Sleep by 10pm” or “Run 3x/week” — the planner will
              respect it.
            </div>
          ) : null}

          {goals.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-2xl border bg-background/80 p-3 shadow-sm"
            >
              <TogglePill
                enabled={g.enabled}
                onToggle={() =>
                  updateGoals(
                    goals.map((x) =>
                      x.id === g.id ? { ...x, enabled: !x.enabled } : x
                    )
                  )
                }
              />

              <Input
                value={g.text}
                onChange={(e) =>
                  updateGoals(
                    goals.map((x) =>
                      x.id === g.id ? { ...x, text: e.target.value } : x
                    )
                  )
                }
                className="h-10 rounded-xl"
                placeholder="e.g. Sleep by 10pm, wake at 5am"
              />

              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => updateGoals(goals.filter((x) => x.id !== g.id))}
                aria-label="Delete goal"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Time blocks */}
      <section className="rounded-[28px] border bg-card/40 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Time blocks</h2>

          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              updateBlocks([
                ...blocks,
                {
                  id: uid(),
                  label: "Class",
                  days: ["mon", "wed"],
                  start: "14:00",
                  end: "16:00",
                  enabled: true,
                },
              ]);
            }}
          >
            Add block
          </Button>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          The AI will avoid scheduling inside these blocks.
        </p>

        <div className="mt-4 space-y-3">
          {blocks.length === 0 ? (
            <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
              Add blocks like classes, work, commute, gym, etc.
            </div>
          ) : null}

          {blocks.map((b) => {
            const isSelected = (d: string) => (b.days ?? []).includes(d);
            return (
              <div
                key={b.id}
                className="rounded-2xl border bg-background/80 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <TogglePill
                    enabled={b.enabled}
                    onToggle={() =>
                      updateBlocks(
                        blocks.map((x) =>
                          x.id === b.id ? { ...x, enabled: !x.enabled } : x
                        )
                      )
                    }
                  />

                  <Input
                    value={b.label}
                    onChange={(e) =>
                      updateBlocks(
                        blocks.map((x) =>
                          x.id === b.id ? { ...x, label: e.target.value } : x
                        )
                      )
                    }
                    className="h-10 w-[220px] rounded-xl"
                    placeholder="Label (Work / Class / Sleep)"
                  />

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Input
                      type="time"
                      value={b.start}
                      onChange={(e) =>
                        updateBlocks(
                          blocks.map((x) =>
                            x.id === b.id ? { ...x, start: e.target.value } : x
                          )
                        )
                      }
                      className="h-10 w-[140px] rounded-xl"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={b.end}
                      onChange={(e) =>
                        updateBlocks(
                          blocks.map((x) =>
                            x.id === b.id ? { ...x, end: e.target.value } : x
                          )
                        )
                      }
                      className="h-10 w-[140px] rounded-xl"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    className="ml-auto rounded-full"
                    onClick={() =>
                      updateBlocks(blocks.filter((x) => x.id !== b.id))
                    }
                    aria-label="Delete time block"
                  >
                    ✕
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {DAYS.map((d) => (
                    <DayChip
                      key={d.key}
                      label={d.label}
                      selected={isSelected(d.key)}
                      onClick={() => {
                        const nextDays = isSelected(d.key)
                          ? b.days.filter((x) => x !== d.key)
                          : [...(b.days ?? []), d.key];

                        updateBlocks(
                          blocks.map((x) =>
                            x.id === b.id ? { ...x, days: nextDays } : x
                          )
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}