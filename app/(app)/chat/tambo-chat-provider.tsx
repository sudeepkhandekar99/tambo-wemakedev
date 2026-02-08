"use client";

import * as React from "react";
import { z } from "zod";
import { TamboProvider } from "@tambo-ai/react";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/appStore";
import { toast } from "sonner";

type DbEvent = {
  id: string;
  user_id: string;
  title: string;
  start_ts: string;
  end_ts: string;
  memo: string | null;
  source: string | null;
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

/* ----------------------------
   Tools
----------------------------- */

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
      memo: z.string().nullable(),
      source: z.string().nullable().optional(),
    })
  ),
});

const createEventsInput = z.object({
  events: z.array(
    z.object({
      title: z.string(),
      startISO: z.string(),
      endISO: z.string(),
      memo: z.string().optional().nullable(),
      source: z.string().optional().default("ai"),
    })
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
const updateEventOutput = z.object({ ok: z.boolean() });

const deleteEventInput = z.object({ id: z.string() });
const deleteEventOutput = z.object({ ok: z.boolean() });

export function TamboChatProvider({ children }: { children: React.ReactNode }) {
  const selectedDate = useAppStore((s) => s.selectedDate);

  const apiKey =
    process.env.NEXT_PUBLIC_TAMBO_API_KEY ||
    process.env.NEXT_PUBLIC_TAMBO_API_TOKEN ||
    "";

  if (!apiKey) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border bg-card p-5">
          <div className="font-medium">Missing Tambo API key</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Add{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_TAMBO_API_KEY</code>{" "}
            in <code className="rounded bg-muted px-1">.env.local</code>, then restart dev
            server.
          </div>
        </div>
      </div>
    );
  }

  return (
    <TamboProvider
      apiKey={apiKey}
      tools={[
        {
          name: "get_schedule",
          description: "Fetch calendar events for the user in a given ISO time range.",
          inputSchema: getScheduleInput,
          outputSchema: getScheduleOutput,
          tool: async ({ startISO, endISO }: z.infer<typeof getScheduleInput>) => {
            const userId = await requireUserId();

            const { data, error } = await supabase
              .from("events")
              .select("id,title,start_ts,end_ts,memo,source")
              .eq("user_id", userId)
              .gte("start_ts", startISO)
              .lte("start_ts", endISO)
              .order("start_ts", { ascending: true });

            if (error) throw new Error(error.message);
            return { events: (data ?? []) as DbEvent[] };
          },
        },
        {
          name: "create_events",
          description:
            "Create one or more calendar events for the user. Only call after the user confirms.",
          inputSchema: createEventsInput,
          outputSchema: createEventsOutput,
          tool: async ({ events }: z.infer<typeof createEventsInput>) => {
            const userId = await requireUserId();

            const rows = events.map((e) => ({
              user_id: userId,
              title: e.title,
              start_ts: new Date(e.startISO).toISOString(),
              end_ts: new Date(e.endISO).toISOString(),
              memo: e.memo ?? null,
              source: e.source ?? "ai",
            }));

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
      contextHelpers={[
        {
          name: "planner",
          fn: async () => {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

            const base = selectedDate
              ? new Date(`${selectedDate}T00:00:00`)
              : new Date();

            const start = startOfDay(base);
            const end = endOfDay(base);

            let events: DbEvent[] = [];
            try {
              const userId = await requireUserId();
              const { data } = await supabase
                .from("events")
                .select("id,title,start_ts,end_ts,memo,source")
                .eq("user_id", userId)
                .gte("start_ts", start.toISOString())
                .lte("start_ts", end.toISOString())
                .order("start_ts", { ascending: true });

              events = (data ?? []) as DbEvent[];
            } catch {
              // ignore context failures
            }

            return {
              app: { name: "Tambo Planner", timezone: tz },
              selectedDate,
              dayRange: { startISO: start.toISOString(), endISO: end.toISOString() },
              dayEvents: events,
              rules: [
                "If proposing a plan, ask user to confirm before calling create_events.",
                "If you need more than today's events, call get_schedule.",
                "When user says accept, call create_events.",
              ],
            };
          },
        },
      ]}
    >
      {children}
    </TamboProvider>
  );
}