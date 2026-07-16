import type { Metadata } from "next";
import Link from "next/link";
import { FormShell } from "@/components/room/form-shell";
import { IdentityForm } from "@/components/room/identity-form";
import { createRoomAction } from "@/server/room-actions";
import { recallIdentity } from "@/lib/session";
import { DEFAULT_HOST_COLOR } from "@/constants/avatar-colors";

export const metadata: Metadata = {
  title: "Start movie night",
  description: "Create a private room and invite your person.",
};

export default async function StartPage() {
  // If they've been here before, don't ask twice.
  const identity = await recallIdentity();

  return (
    <FormShell
      eyebrow="Start movie night"
      title="Who's watching?"
      subtitle="Your name and a color — that's all Pelli needs. No account, no email."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Been invited to a room?{" "}
          <Link
            href="/join"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Join with a code
          </Link>
        </p>
      }
    >
      <IdentityForm
        action={createRoomAction}
        defaultIdentity={identity}
        defaultColor={DEFAULT_HOST_COLOR}
        submitLabel="Create the room"
      />
    </FormShell>
  );
}
