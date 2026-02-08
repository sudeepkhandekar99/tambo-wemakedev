"use client";

import * as React from "react";
import { TamboProvider } from "@tambo-ai/react";
import { MessageThreadCollapsible } from "@/components/tambo/message-thread-collapsible";

const tamboKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY || "";

export function ChatClient() {
  if (!tamboKey) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border bg-card p-5">
          <div className="font-medium">Missing Tambo API key</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_TAMBO_API_KEY</code>{" "}
            in <code className="rounded bg-muted px-1">.env.local</code>, then restart dev server.
          </div>
        </div>
      </div>
    );
  }

  return (
    <TamboProvider apiKey={tamboKey}>
      <div className="h-full w-full">
        <MessageThreadCollapsible />
      </div>
    </TamboProvider>
  );
}