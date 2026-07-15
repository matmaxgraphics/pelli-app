"use client";

import { motion } from "framer-motion";
import { Radio, MessageCircle, Sparkles, Bookmark } from "lucide-react";
import { site } from "@/lib/site";

const icons = [Radio, MessageCircle, Sparkles, Bookmark];

export function Features() {
  return (
    <section className="container py-20 md:py-24">
      <div className="max-w-lg">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Everything that makes it feel like the same room.
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Not a streaming service — a way to be together while you watch.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {site.features.map((feature, i) => {
          const Icon = icons[i];
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 2) * 0.06 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-subtle"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-medium">{feature.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
