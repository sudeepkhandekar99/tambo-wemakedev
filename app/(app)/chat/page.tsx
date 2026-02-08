"use client";

import { TamboChatProvider } from "./tambo-chat-provider";
import { MessageThreadCollapsible } from "@/components/tambo/message-thread-collapsible";

export default function ChatPage() {
  return (
    <TamboChatProvider>
      <div className="min-h-[calc(100vh-64px)]">
        <MessageThreadCollapsible />
      </div>
    </TamboChatProvider>
  );
}