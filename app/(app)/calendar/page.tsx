// app/calendar/page.tsx
"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DbEvent = {
  id: string;
  user_id: string;
  title: string;
  start_ts: string;
  end_ts: string;
  memo: string | null;
  source: "manual" | "ai" | string;
  created_at?: string;
};

type RbcEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  memo?: string | null;
  source?: string;
};

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

function toRbc(e: DbEvent): RbcEvent {
  return {
    id: e.id,
    title: e.title,
    start: new Date(e.start_ts),
    end: new Date(e.end_ts),
    memo: e.memo,
    source: e.source,
  };
}

function toDbPatch(e: RbcEvent) {
  return {
    title: e.title,
    start_ts: e.start.toISOString(),
    end_ts: e.end.toISOString(),
    memo: e.memo ?? null,
    source: e.source ?? "manual",
  };
}

function padRange(start: Date, end: Date) {
  return {
    start: new Date(start.getTime() - 24 * 3600 * 1000),
    end: new Date(end.getTime() + 24 * 3600 * 1000),
  };
}

export default function CalendarPage() {
  const [events, setEvents] = React.useState<RbcEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [view, setView] = React.useState<View>("week");
  const [date, setDate] = React.useState<Date>(new Date());

  const [range, setRange] = React.useState<{ start: Date; end: Date }>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    return { start, end };
  });

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [draft, setDraft] = React.useState<RbcEvent | null>(null);

  async function requireUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      toast.error("Auth error");
      return null;
    }
    return data.user?.id ?? null;
  }

  async function fetchEvents(r = range) {
    setLoading(true);
    const userId = await requireUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .gte("start_ts", r.start.toISOString())
      .lte("start_ts", r.end.toISOString())
      .order("start_ts", { ascending: true });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setEvents((data as DbEvent[]).map(toRbc));
    setLoading(false);
  }

  React.useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate(start: Date, end: Date) {
    setMode("create");
    setDraft({
      id: crypto.randomUUID(),
      title: "",
      start,
      end,
      memo: "",
      source: "manual",
    });
    setOpen(true);
  }

  function openEdit(e: RbcEvent) {
    setMode("edit");
    setDraft({ ...e });
    setOpen(true);
  }

  async function save() {
    if (!draft) return;

    const userId = await requireUserId();
    if (!userId) return;

    const title = (draft.title ?? "").trim();
    if (!title) {
      toast.message("Add a title");
      return;
    }
    if (draft.end <= draft.start) {
      toast.message("End time must be after start");
      return;
    }

    if (mode === "create") {
      const { error } = await supabase.from("events").insert({
        user_id: userId,
        ...toDbPatch(draft),
      });

      if (error) return toast.error(error.message);
      toast.success("Event added");
    } else {
      const { error } = await supabase
        .from("events")
        .update(toDbPatch(draft))
        .eq("id", draft.id)
        .eq("user_id", userId);

      if (error) return toast.error(error.message);
      toast.success("Event updated");
    }

    setOpen(false);
    setDraft(null);
    await fetchEvents();
  }

  async function remove() {
    if (!draft) return;
    const userId = await requireUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", draft.id)
      .eq("user_id", userId);

    if (error) return toast.error(error.message);

    toast.success("Event deleted");
    setOpen(false);
    setDraft(null);
    await fetchEvents();
  }

  const eventPropGetter = React.useCallback((event: RbcEvent) => {
    const isAi = (event.source ?? "").toLowerCase() === "ai";
    return {
      className: isAi ? "rbc-ai-event" : "rbc-manual-event",
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-display text-2xl tracking-tight">Calendar</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Click and drag on the calendar to create an event. Click an event to edit.
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            const now = new Date();
            const end = new Date(now);
            end.setMinutes(end.getMinutes() + 30);
            openCreate(now, end);
          }}
          className="rounded-full"
        >
          Add event
        </Button>
      </div>

      <div className="rounded-[24px] border bg-card/40 p-3">
        <div className="overflow-hidden rounded-[20px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            date={date}
            onNavigate={(d) => setDate(d)}
            view={view}
            onView={(v) => setView(v)}
            views={["day", "week", "month"]}
            style={{ height: 720 }}
            selectable
            onSelectSlot={(slot) => openCreate(slot.start, slot.end)}
            onSelectEvent={(e) => openEdit(e as RbcEvent)}
            onRangeChange={(r: any) => {
              let start: Date;
              let end: Date;

              if (Array.isArray(r)) {
                start = r[0];
                end = r[r.length - 1];
              } else {
                start = r.start;
                end = r.end;
              }

              const padded = padRange(start, end);
              setRange(padded);
              fetchEvents(padded);
            }}
            eventPropGetter={eventPropGetter}
          />
        </div>

        {loading ? (
          <div className="px-2 pt-3 text-sm text-muted-foreground">Loading…</div>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[24px] border border-black/10 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {mode === "create" ? "New event" : "Edit event"}
            </DialogTitle>
          </DialogHeader>

          {draft ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Title</div>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Morning run, Study block, Work…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Start</div>
                  <Input
                    type="datetime-local"
                    value={format(draft.start, "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setDraft({ ...draft, start: new Date(e.target.value) })}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">End</div>
                  <Input
                    type="datetime-local"
                    value={format(draft.end, "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setDraft({ ...draft, end: new Date(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Notes</div>
                <Textarea
                  value={draft.memo ?? ""}
                  onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Button onClick={save} className="rounded-full">
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setOpen(false);
                      setDraft(null);
                    }}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                </div>

                {mode === "edit" ? (
                  <Button variant="destructive" onClick={remove} className="rounded-full">
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}