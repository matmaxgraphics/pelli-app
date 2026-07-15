"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PresenceSync } from "./presence-sync";
import { site } from "@/lib/site";

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] },
  }),
};

/** Split the headline so the emotional word can carry the coral accent. */
function Headline() {
  const { headline, accentWord } = site.hero;
  const [before, after] = headline.split(accentWord);
  return (
    <>
      {before}
      <span className="relative whitespace-nowrap text-primary">
        {accentWord}
      </span>
      {after}
    </>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft, single-accent wash — no gradients-as-decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-64 max-w-3xl rounded-full bg-accent/60 blur-3xl"
      />
      <div className="container grid items-center gap-14 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-28">
        <div className="max-w-xl">
          <motion.p
            variants={rise}
            custom={0}
            initial="hidden"
            animate="show"
            className="mb-5 text-sm font-medium uppercase tracking-wider text-muted-foreground"
          >
            {site.hero.eyebrow}
          </motion.p>

          <motion.h1
            variants={rise}
            custom={1}
            initial="hidden"
            animate="show"
            className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl"
          >
            <Headline />
          </motion.h1>

          <motion.p
            variants={rise}
            custom={2}
            initial="hidden"
            animate="show"
            className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground"
          >
            {site.hero.story}
          </motion.p>

          <motion.div
            variants={rise}
            custom={3}
            initial="hidden"
            animate="show"
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Button asChild size="lg">
              <Link href="/start">{site.hero.primaryCta}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/join">{site.hero.secondaryCta}</Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <PresenceSync />
        </motion.div>
      </div>
    </section>
  );
}
