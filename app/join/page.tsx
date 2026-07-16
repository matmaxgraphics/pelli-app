import type { Metadata } from "next";
import Link from "next/link";
import { FormShell } from "@/components/room/form-shell";
import { CodeForm } from "@/components/room/code-form";

export const metadata: Metadata = {
  title: "Join a room",
  description: "Enter the room code you were given.",
};

export default function JoinPage() {
  return (
    <FormShell
      eyebrow="Join a room"
      title="What's the code?"
      subtitle="Whoever started the night has a six-character code. Or just open the link they sent you."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Nobody&apos;s started one yet?{" "}
          <Link
            href="/start"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Start movie night
          </Link>
        </p>
      }
    >
      <CodeForm />
    </FormShell>
  );
}
