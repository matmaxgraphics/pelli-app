"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { insertMessage } from "@/lib/supabase/social";
import { SOCIAL_EVENT } from "@/types/chat";
import type { AvatarColorId } from "@/constants/avatar-colors";
import type { ChatMessage, Me, TypingSignal } from "@/types/chat";

interface MessageRow {
  id: string;
  room_code: string;
  participant_id: string | null;
  author_name: string;
  author_color: string;
  body: string;
  created_at: string;
}

function rowToMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    roomCode: row.room_code,
    participantId: row.participant_id,
    authorName: row.author_name,
    authorColor: row.author_color as AvatarColorId,
    body: row.body,
    createdAt: row.created_at,
  };
}

/** Stop showing "X is typing" this long after their last keystroke. */
const TYPING_TIMEOUT_MS = 3500;
/** Don't broadcast a typing ping more than this often. */
const TYPING_THROTTLE_MS = 1500;

interface ChatState {
  messages: ChatMessage[];
  /** Names of *other* people currently typing. */
  typingNames: string[];
  sendMessage: (body: string) => void;
  notifyTyping: () => void;
}

/**
 * Live chat for a room: persisted messages delivered over postgres_changes, and
 * ephemeral typing pings over broadcast on the same channel.
 *
 * Sends are optimistic — the message appears instantly and the echoed
 * postgres_changes row is deduped by id — so the composer feels immediate.
 */
export function useChat(
  code: string,
  me: Me,
  initial: ChatMessage[],
): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [typing, setTyping] = useState<Record<string, string>>({});

  const channelRef = useRef<ReturnType<
    ReturnType<typeof getSupabaseBrowserClient>["channel"]
  > | null>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastTypingSent = useRef(0);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`room-chat:${code}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_code=eq.${code}`,
        },
        (payload) => {
          const message = rowToMessage(payload.new as MessageRow);
          setMessages((current) =>
            current.some((m) => m.id === message.id)
              ? current
              : [...current, message],
          );
        },
      )
      .on("broadcast", { event: SOCIAL_EVENT.typing }, ({ payload }) => {
        const signal = payload as TypingSignal;
        if (signal.participantId === me.id) return;

        setTyping((current) => ({ ...current, [signal.participantId]: signal.name }));
        clearTimeout(typingTimers.current[signal.participantId]);
        typingTimers.current[signal.participantId] = setTimeout(() => {
          setTyping((current) => {
            const next = { ...current };
            delete next[signal.participantId];
            return next;
          });
        }, TYPING_TIMEOUT_MS);
      })
      .subscribe();

    const timers = typingTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [code, me.id]);

  const sendMessage = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        roomCode: code,
        participantId: me.id,
        authorName: me.name,
        authorColor: me.color,
        body: trimmed,
        createdAt: new Date().toISOString(),
      };

      // Optimistic: show it now, reconcile with the echoed row by id.
      setMessages((current) => [...current, message]);
      void insertMessage({ id: message.id, roomCode: code, me, body: trimmed }).catch(
        () => {
          // The insert failed — drop the optimistic message so we don't imply
          // it was delivered.
          setMessages((current) => current.filter((m) => m.id !== message.id));
        },
      );
    },
    [code, me],
  );

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
    lastTypingSent.current = now;
    void channelRef.current?.send({
      type: "broadcast",
      event: SOCIAL_EVENT.typing,
      payload: { participantId: me.id, name: me.name } satisfies TypingSignal,
    });
  }, [me.id, me.name]);

  return { messages, typingNames: Object.values(typing), sendMessage, notifyTyping };
}
