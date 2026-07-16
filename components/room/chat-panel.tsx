"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { ParticipantDot } from "./participant-dot";
import { MAX_MESSAGE_LENGTH } from "@/lib/supabase/social";
import { cn } from "@/lib/utils";
import type { ChatMessage, Me } from "@/types/chat";

/**
 * The conversation, alongside the film. Persisted history, live messages, a
 * typing line, and a composer — the "talk through it" half of watching together.
 */
export function ChatPanel({
  code,
  me,
  initialMessages,
  className,
}: {
  code: string;
  me: Me;
  initialMessages: ChatMessage[];
  className?: string;
}) {
  const { messages, typingNames, sendMessage, notifyTyping } = useChat(
    code,
    me,
    initialMessages,
  );
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pin to the newest message as the conversation grows (and while typing shows).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typingNames]);

  function submit() {
    const body = draft.trim();
    if (!body) return;
    sendMessage(body);
    setDraft("");
  }

  return (
    <section
      aria-label="Chat"
      className={cn(
        "flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-subtle",
        className,
      )}
    >
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Chat
        </h2>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Say something — the first word of the night.
          </p>
        ) : (
          messages.map((message) => (
            <Message key={message.id} message={message} mine={message.participantId === me.id} />
          ))
        )}
      </div>

      <div className="border-t border-border px-4 pb-3 pt-2">
        <div className="h-5">
          {typingNames.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatTyping(typingNames)}
            </p>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              notifyTyping();
            }}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter is a newline.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Message…"
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            className={cn(
              "max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-lg border border-border bg-background px-3.5 py-2.5",
              "text-base md:text-sm text-foreground placeholder:text-muted-foreground",
              "outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
            )}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground",
              "shadow-subtle transition-colors hover:bg-primary-hover",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}

function Message({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className="flex gap-2.5">
      <ParticipantDot color={message.authorColor} className="mt-1.5" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {mine ? "You" : message.authorName}
          </span>
        </p>
        <p className="whitespace-pre-wrap break-words text-sm text-foreground">
          {message.body}
        </p>
      </div>
    </div>
  );
}

function formatTyping(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return "Several people are typing…";
}
