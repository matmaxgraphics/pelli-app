"use client";

import { motion } from "framer-motion";
import { site } from "@/lib/site";

export function HowItWorks() {
  return (
    <section className="border-t border-border/70 bg-muted/40">
      <div className="container py-20 md:py-24">
        <h2 className="max-w-lg text-2xl font-semibold tracking-tight md:text-3xl">
          Two people, one movie, zero fuss.
        </h2>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {site.steps.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="relative"
            >
              <span className="font-mono text-sm text-primary">{step.n}</span>
              <h3 className="mt-3 text-lg font-medium">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
