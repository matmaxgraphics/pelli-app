import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { site } from "@/lib/site";

/**
 * The frame for the two doors into a room — start and join. Deliberately quiet
 * and narrow: one decision per screen, nothing to read past.
 */
export function FormShell({
  eyebrow,
  title,
  subtitle,
  backHref = "/",
  backLabel = "Back",
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="container flex min-h-svh flex-col py-8">
      <div className="flex items-center justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">
            {site.name}
          </span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            {subtitle}
          </p>

          <div className="mt-9">{children}</div>

          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
