import { SiteNav } from "@/components/marketing/site-nav";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Features } from "@/components/marketing/features";
import { ClosingCta } from "@/components/marketing/closing-cta";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
