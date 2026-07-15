import Link from "next/link";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">
            {site.name}
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/join">{site.hero.secondaryCta}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/start">{site.hero.primaryCta}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
