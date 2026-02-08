"use client";

import * as React from "react";
import { z } from "zod";
import { TamboProvider } from "@tambo-ai/react";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/appStore";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";

type DbEvent = {
  id: string;
  user_id: string;
  title: string;
  start_ts: string;
  end_ts: string;
  memo: string | null;
  source: string | null;
};

type Goal = { id: string; text: string; enabled: boolean };

type TimeBlock = {
  id: string;
  label: string;
  days: string[]; // ["mon","wed"]
  start: string; // "14:00"
  end: string; // "16:00"
  enabled: boolean;
};

type Preferences = {
  timezone?: string;
  goals?: Goal[];
  timeBlocks?: TimeBlock[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user?.id) throw new Error("Not logged in");
  return data.user.id;
}

async function getPreferences(userId: string): Promise<Preferences> {
  const { data, error } = await supabase
    .from("profiles")
    .select("preferences_json")
    .eq("id", userId)
    .single();

  if (error) return {};
  return (data?.preferences_json ?? {}) as Preferences;
}

/* =========================
   Tool Schemas
   ========================= */

const getScheduleInput = z.object({
  startISO: z.string(),
  endISO: z.string(),
});

const getScheduleOutput = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      start_ts: z.string(),
      end_ts: z.string(),
      start_local: z.string(),
      end_local: z.string(),
      memo: z.string().nullable(),
      source: z.string().nullable().optional(),
    })
  ),
});

const createEventsInput = z.object({
  events: z.array(
    z.union([
      z.object({
        title: z.string(),
        startISO: z.string(),
        endISO: z.string(),
        memo: z.string().optional().nullable(),
        source: z.string().optional().default("ai"),
      }),
      z.string(),
    ])
  ),
});

const createEventsOutput = z.object({
  created: z.number(),
});

const updateEventInput = z.object({
  id: z.string(),
  patch: z.object({
    title: z.string().optional(),
    startISO: z.string().optional(),
    endISO: z.string().optional(),
    memo: z.string().optional().nullable(),
  }),
});

const updateEventOutput = z.object({
  ok: z.boolean(),
});

const deleteEventInput = z.object({
  id: z.string(),
});

const deleteEventOutput = z.object({
  ok: z.boolean(),
});

/* =========================
   Provider
   ========================= */

export function TamboChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const selectedDate = useAppStore((s) => s.selectedDate);

  const apiKey =
    process.env.NEXT_PUBLIC_TAMBO_API_KEY ||
    process.env.NEXT_PUBLIC_TAMBO_API_TOKEN ||
    "";

  if (!apiKey) {
    console.warn("Missing NEXT_PUBLIC_TAMBO_API_KEY in .env.local");
  }

  return (
    <TamboProvider
      apiKey={apiKey}
      contextKey="planner"
      tools={[
        {
          name: "get_schedule",
          description:
            "Fetch calendar events for the user in a given time range.",
          inputSchema: getScheduleInput,
          outputSchema: getScheduleOutput,
          tool: async ({
            startISO,
            endISO,
          }: z.infer<typeof getScheduleInput>) => {
            const userId = await requireUserId();
            const tz =
              Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

            const { data, error } = await supabase
              .from("events")
              .select("id,title,start_ts,end_ts,memo,source")
              .eq("user_id", userId)
              .gte("start_ts", startISO)
              .lte("start_ts", endISO)
              .order("start_ts", { ascending: true });

            if (error) throw new Error(error.message);

            const rows = (data ?? []) as DbEvent[];

            return {
              events: rows.map((e) => ({
                ...e,
                start_local: formatInTimeZone(
                  new Date(e.start_ts),
                  tz,
                  "MMM d, h:mm a"
                ),
                end_local: formatInTimeZone(
                  new Date(e.end_ts),
                  tz,
                  "MMM d, h:mm a"
                ),
              })),
            };
          },
        },

        {
          name: "create_events",
          description:
            "Create one or more calendar events for the user. Accepts events as objects or JSON strings.",
          inputSchema: createEventsInput,
          outputSchema: createEventsOutput,
          tool: async ({ events }: z.infer<typeof createEventsInput>) => {
            const userId = await requireUserId();

            // Normalize: convert JSON strings -> objects
            const normalized = events.map((e) => {
              if (typeof e === "string") {
                try {
                  return JSON.parse(e) as {
                    title: string;
                    startISO: string;
                    endISO: string;
                    memo?: string | null;
                    source?: string;
                  };
                } catch {
                  throw new Error(
                    "create_events received an invalid JSON string event."
                  );
                }
              }
              return e;
            });

            const rows = normalized.map((e) => {
              const start = new Date(e.startISO);
              const end = new Date(e.endISO);

              if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                throw new Error(
                  `Invalid time value in create_events. startISO=${e.startISO} endISO=${e.endISO}`
                );
              }

              return {
                user_id: userId,
                title: e.title,
                start_ts: start.toISOString(),
                end_ts: end.toISOString(),
                memo: e.memo ?? null,
                source: e.source ?? "ai",
              };
            });

            const { error } = await supabase.from("events").insert(rows);
            if (error) throw new Error(error.message);

            toast.success(`Added ${rows.length} event(s)`);
            return { created: rows.length };
          },
        },

        {
          name: "update_event",
          description: "Update an existing event by id.",
          inputSchema: updateEventInput,
          outputSchema: updateEventOutput,
          tool: async ({ id, patch }: z.infer<typeof updateEventInput>) => {
            const userId = await requireUserId();

            const updateRow: any = {};
            if (patch.title !== undefined) updateRow.title = patch.title;
            if (patch.startISO !== undefined)
              updateRow.start_ts = new Date(patch.startISO).toISOString();
            if (patch.endISO !== undefined)
              updateRow.end_ts = new Date(patch.endISO).toISOString();
            if (patch.memo !== undefined) updateRow.memo = patch.memo;

            const { error } = await supabase
              .from("events")
              .update(updateRow)
              .eq("id", id)
              .eq("user_id", userId);

            if (error) throw new Error(error.message);

            toast.success("Event updated");
            return { ok: true };
          },
        },

        {
          name: "delete_event",
          description: "Delete an event by id.",
          inputSchema: deleteEventInput,
          outputSchema: deleteEventOutput,
          tool: async ({ id }: z.infer<typeof deleteEventInput>) => {
            const userId = await requireUserId();

            const { error } = await supabase
              .from("events")
              .delete()
              .eq("id", id)
              .eq("user_id", userId);

            if (error) throw new Error(error.message);

            toast.success("Event deleted");
            return { ok: true };
          },
        },
      ]}
      contextHelpers={{
        planner: async () => {
          const tz =
            Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

          const base = selectedDate
            ? new Date(`${selectedDate}T00:00:00`)
            : new Date();

          const start = startOfDay(base);
          const end = endOfDay(base);

          let events: DbEvent[] = [];
          let prefs: Preferences = {};

          try {
            const userId = await requireUserId();

            prefs = await getPreferences(userId);

            const { data } = await supabase
              .from("events")
              .select("id,title,start_ts,end_ts,memo,source")
              .eq("user_id", userId)
              .gte("start_ts", start.toISOString())
              .lte("start_ts", end.toISOString())
              .order("start_ts", { ascending: true });

            events = (data ?? []) as DbEvent[];
          } catch {
            // ignore failures
          }

          const enabledGoals = (prefs.goals ?? []).filter(
            (g) => g.enabled && g.text.trim()
          );

          const enabledBlocks = (prefs.timeBlocks ?? []).filter((b) => b.enabled);

          return {
            app: { name: "Tambo Planner", timezone: tz },
            selectedDate,
            dayRange: {
              startISO: start.toISOString(),
              endISO: end.toISOString(),
            },
            dayEvents: events,

            // preferences injected into EVERY message automatically
            preferences: {
              timezone: prefs.timezone ?? tz,
              goals: enabledGoals.map((g) => g.text),
              timeBlocks: enabledBlocks.map((b) => ({
                label: b.label,
                days: b.days,
                start: b.start,
                end: b.end,
              })),
            },

            rules: [
              // NEW rules
              "Respect user goals (e.g., sleep by 10:30pm, wake at 5am).",
              "Do not schedule events inside user timeBlocks (classes/busy time).",

              // existing rules
              "If proposing a plan, ask user to confirm before calling create_events.",
              "Use get_schedule if you need more than today's events.",
              "When user says accept, call create_events.",
              "Prefer displaying start_local/end_local times to the user.",
            ],
          };
        },
      }}
    >
      {children}
    </TamboProvider>
  );
}