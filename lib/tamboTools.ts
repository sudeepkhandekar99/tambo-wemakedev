import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

/**
 * Minimal tools:
 * - read events
 * - create/update/delete events
 *
 * These run client-side (uses the logged-in Supabase session).
 */

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

export const tamboTools = [
  {
    name: "get_schedule",
    description:
      "Fetch calendar events for the logged-in user within a date-time range.",
    inputSchema: z.object({
      startISO: z.string().describe("Start datetime ISO string"),
      endISO: z.string().describe("End datetime ISO string"),
    }),
    handler: async (input: { startISO: string; endISO: string }) => {
      const userId = await requireUserId();

      const { data, error } = await supabase
        .from("events")
        .select("id,title,start_ts,end_ts,memo,source")
        .eq("user_id", userId)
        .gte("start_ts", input.startISO)
        .lte("start_ts", input.endISO)
        .order("start_ts", { ascending: true });

      if (error) throw new Error(error.message);

      return {
        startISO: input.startISO,
        endISO: input.endISO,
        events: (data ?? []).map((e) => ({
          id: e.id,
          title: e.title,
          start_ts: e.start_ts,
          end_ts: e.end_ts,
          memo: e.memo,
          source: e.source,
        })),
      };
    },
  },

  {
    name: "create_event",
    description:
      "Create a single calendar event. Use this after the user accepts a proposed plan.",
    inputSchema: z.object({
      title: z.string().min(1),
      startISO: z.string(),
      endISO: z.string(),
      memo: z.string().optional(),
      source: z.string().optional().describe("ai or manual; default ai"),
    }),
    handler: async (input: {
      title: string;
      startISO: string;
      endISO: string;
      memo?: string;
      source?: string;
    }) => {
      const userId = await requireUserId();

      const payload = {
        user_id: userId,
        title: input.title,
        start_ts: input.startISO,
        end_ts: input.endISO,
        memo: input.memo ?? null,
        source: input.source ?? "ai",
      };

      const { data, error } = await supabase
        .from("events")
        .insert(payload)
        .select("id,title,start_ts,end_ts,memo,source")
        .single();

      if (error) throw new Error(error.message);

      return { created: data };
    },
  },

  {
    name: "update_event",
    description: "Update an existing event (title/time/notes).",
    inputSchema: z.object({
      id: z.string(),
      title: z.string().optional(),
      startISO: z.string().optional(),
      endISO: z.string().optional(),
      memo: z.string().nullable().optional(),
    }),
    handler: async (input: {
      id: string;
      title?: string;
      startISO?: string;
      endISO?: string;
      memo?: string | null;
    }) => {
      const userId = await requireUserId();

      const patch: any = {};
      if (typeof input.title !== "undefined") patch.title = input.title;
      if (typeof input.startISO !== "undefined") patch.start_ts = input.startISO;
      if (typeof input.endISO !== "undefined") patch.end_ts = input.endISO;
      if (typeof input.memo !== "undefined") patch.memo = input.memo;

      const { data, error } = await supabase
        .from("events")
        .update(patch)
        .eq("id", input.id)
        .eq("user_id", userId)
        .select("id,title,start_ts,end_ts,memo,source")
        .single();

      if (error) throw new Error(error.message);

      return { updated: data };
    },
  },

  {
    name: "delete_event",
    description: "Delete an event by id.",
    inputSchema: z.object({
      id: z.string(),
    }),
    handler: async (input: { id: string }) => {
      const userId = await requireUserId();

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", input.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);

      return { deletedId: input.id };
    },
  },
] as const;