"use client";

import { TamboChatProvider } from "./tambo-chat-provider";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";

export default function ChatPage() {
  return (
    <TamboChatProvider>
      <main className="h-[calc(100vh-64px)] w-full px-6 py-6">
        <div className="h-full w-full rounded-3xl border bg-card/60 p-4 shadow-sm">
          <MessageThreadFull className="h-full w-full" />
        </div>
      </main>
    </TamboChatProvider>
  );
}