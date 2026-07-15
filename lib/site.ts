/**
 * All landing-page copy in one place. Keeping words as data makes the voice
 * easy to keep consistent and easy to tune before the demo.
 */

export const site = {
  name: "Pelli",
  tagline: "Movie nights, no matter the miles.",

  hero: {
    eyebrow: "The same couch, miles apart",
    headline: "Movie nights, no matter the miles.",
    accentWord: "miles",
    story:
      "You still send each other films to watch. Pelli lets you actually watch them together — same frame, same second — even when you're cities apart.",
    primaryCta: "Start movie night",
    secondaryCta: "Join a room",
  },

  steps: [
    {
      n: "01",
      title: "Start the night",
      body: "Upload an MP4 and Pelli spins up a private room. No setup, no accounts.",
    },
    {
      n: "02",
      title: "Send one link",
      body: "Your person joins with a name and a color. That's the whole invite.",
    },
    {
      n: "03",
      title: "Press play together",
      body: "A short countdown, then you're on the same second — pause, seek, and react in step.",
    },
  ],

  features: [
    {
      title: "Stay in sync",
      body: "Everyone's playhead stays within half a second. Pause here and it pauses there.",
    },
    {
      title: "Talk through it",
      body: "Live chat, typing dots, and reactions that float up over the film as it plays.",
    },
    {
      title: "A companion that gets it",
      body: "Ask what just happened or who a character is — answers stay spoiler-free to where you are.",
    },
    {
      title: "Keep the night",
      body: "When the credits roll, Pelli writes a shared recap — kept as a permanent keepsake of the night.",
    },
  ],

  closing: {
    line: "Distance shouldn't cancel movie night.",
    cta: "Start movie night",
  },

  footer: {
    note: "Built for the Spark hackathon.",
  },
} as const;
