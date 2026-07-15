import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="container flex flex-col items-center justify-between gap-3 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          <span className="font-medium text-foreground">{site.name}</span>
        </div>
        <p>{site.footer.note}</p>
      </div>
    </footer>
  );
}
