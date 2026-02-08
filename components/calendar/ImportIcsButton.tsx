"use client";

import * as React from "react";
import ICAL from "ical.js";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type InsertEvent = {
  user_id: string;
  title: string;
  start_ts: string;
  end_ts: string;
  memo: string | null;
  source: string;
};

function safeDate(d: Date) {
  return isNaN(d.getTime()) ? null : d;
}

function normalizeEventTimes(evt: any) {
  // ICAL.Event
  const summary = (evt.summary || "Untitled").toString();

  const startICAL = evt.startDate;
  const endICAL = evt.endDate;

  let start = safeDate(startICAL?.toJSDate?.() ?? null);
  let end = safeDate(endICAL?.toJSDate?.() ?? null);

  // All-day events come as "date" (no time). Give them a visible 1-hour block.
  if (startICAL?.isDate) {
    const s = new Date(start as Date);
    s.setHours(9, 0, 0, 0);
    const e = new Date(s);
    e.setHours(10, 0, 0, 0);
    start = s;
    end = e;
  }

  if (!start) return null;

  if (!end || end <= start) {
    const e = new Date(start);
    e.setHours(e.getHours() + 1);
    end = e;
  }

  return { summary, start, end };
}

export function ImportIcsButton({
  onImported,
}: {
  onImported?: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function importIcs(file: File) {
    setBusy(true);
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw new Error(userErr.message);
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not logged in");

      const text = await file.text();

      // Parse ICS
      const jcalData = ICAL.parse(text);
      const comp = new ICAL.Component(jcalData);

      // For hackathon: import non-recurring events cleanly.
      const vevents = comp.getAllSubcomponents("vevent");

      if (!vevents.length) {
        toast.message("No events found in this .ics file");
        return;
      }

      const rows: InsertEvent[] = [];

      for (const v of vevents) {
        const evt = new ICAL.Event(v);
        const normalized = normalizeEventTimes(evt);
        if (!normalized) continue;

        const { summary, start, end } = normalized;

        // store UID in memo for lightweight “traceability”
        const uid = evt.uid ? String(evt.uid) : null;
        const memo = uid ? `gcal_uid:${uid}` : null;

        rows.push({
          user_id: userId,
          title: summary,
          start_ts: start.toISOString(),
          end_ts: end.toISOString(),
          memo,
          source: "google_import",
        });
      }

      if (!rows.length) {
        toast.message("No usable events found");
        return;
      }

      // Insert in chunks to avoid payload limits
      const CHUNK = 200;
      let inserted = 0;

      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const { error } = await supabase.from("events").insert(chunk);
        if (error) throw new Error(error.message);
        inserted += chunk.length;
      }

      toast.success(`Imported ${inserted} events ✨`);
      onImported?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          // reset so selecting same file again still triggers onChange
          e.currentTarget.value = "";
          importIcs(f);
        }}
      />

      <Button
        variant="secondary"
        className="rounded-full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Importing…" : "Import .ics"}
      </Button>
    </>
  );
}