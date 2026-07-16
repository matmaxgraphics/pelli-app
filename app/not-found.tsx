import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Reached by a mistyped room link or a room that's gone. Gives direction, not
 * mood — and never shows the framework's default error page in a demo.
 */
export default function NotFound() {
  return (
    <main className="container flex min-h-svh flex-col items-center justify-center py-16 text-center">
      <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
      <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight">
        That room isn&apos;t here.
      </h1>
      <p className="mt-3 max-w-sm text-pretty leading-relaxed text-muted-foreground">
        The code may have a typo, or the night may already be over. Check the
        link with your person, or start a new one.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/start">Start movie night</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/join">Join with a code</Link>
        </Button>
      </div>
    </main>
  );
}
