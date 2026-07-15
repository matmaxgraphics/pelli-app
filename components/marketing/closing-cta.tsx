"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export function ClosingCta() {
  return (
    <section className="border-t border-border/70">
      <div className="container py-24 text-center md:py-32">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl"
        >
          {site.closing.line}
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8"
        >
          <Button asChild size="lg">
            <Link href="/start">{site.closing.cta}</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
