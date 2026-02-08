"use client";

import { MessageThreadPanel } from "@/tambo/message-thread-panel";
import { ControlBar } from "@/tambo/control-bar";

export default function AppHomePage() {
  return (
    <div className="flex h-[calc(100vh-120px)] w-full overflow-hidden rounded-3xl border bg-card">
      {/* Main Tambo chat panel */}
      <div className="flex-1">
        <MessageThreadPanel className="h-full w-full border-0" />
      </div>

      {/* Floating quick command bar (Cmd/Ctrl + K) */}
      <ControlBar />
    </div>
  );
}