# Pelli — Engineering & Design Rules

> The north star for every line of code in this project. If a decision isn't
> covered here, choose the option that makes the **live demo** more reliable and
> the experience more **human**.

Pelli exists for one reason: **distance shouldn't cancel movie night.** It is not
a streaming platform — it's a shared-experience platform. Every design and
engineering decision should reinforce the feeling of sitting on the same couch,
miles apart.

---

## 1. Hackathon constraints (Spark · BuildAnything)

These are non-negotiable eligibility and judging facts. Read before scoping any feature.

- **Deadline:** Jul 19, 11:59 PM UTC. Scope every feature to survive that clock.
- **Onchain requirement:** The submission must include a real smart contract
  deployed on **Monad** (testnet is fine) and its **contract address** in the
  submission. An app with no working onchain component is not eligible.
- **The onchain component must be genuine, not decorative.** Judges explicitly
  penalize forced crypto ("AI slop") and vaporware (a submit button that only
  fires a toast over a hardcoded string). Practical impact beats fancy tech.
- **No AI slop:** the app must not read as obviously AI-generated on open. It
  needs a unique identity, must fit the viewport, and must avoid the templated
  look. (This is why we have an explicit design system below.)
- **Live, not static:** the judging agent inspects commit history and looks for
  placeholder data standing in for a working app. Everything demoed must be real.
- **Submission needs:** hosted URL, public GitHub repo, README with setup steps,
  a ≤3-min demo video, category (Monad testnet), and the contract address.

### Onchain integration for Pelli (proposed, confirm before Summary feature)

**Mint the Movie Night Summary as a keepsake on Monad.** The brief already frames
the summary as "a keepsake." We make it a permanent onchain record of the night —
movie title, participants, date, top reactions — that both people can keep. This
is the product thesis (togetherness across distance) made permanent, not crypto
bolted on. The contract is small and purpose-built: `mintMovieNight(...)` writing
an immutable memory. This is the only place blockchain touches the product; the
core experience (rooms, sync, chat, AI) never blocks on a wallet.

---

## 2. Strict rules (do not violate)

1. Never sacrifice UX for additional features.
2. Complete features beat many unfinished ones.
3. Every screen must be presentation-ready — no half-states shown in the demo.
4. Build mobile-first; optimize the demo for desktop.
5. Prefer reliability over complexity.
6. Every AI feature must have a clear, contextual purpose.
7. No placeholder or lorem ipsum in the final UI.
8. No neon, glowing borders, glassmorphism overload, or cyberpunk aesthetics.
9. Use shadcn/ui components whenever possible.
10. Write production-quality, clean, modular TypeScript (strict mode).
11. Keep the codebase simple enough that a second dev understands it quickly.
12. When multiple approaches exist, pick the one easiest to demo reliably.
13. Before any feature, ask: "Will this improve the live demo?" If not, defer it.

---

## 3. Design system (single source of truth)

Feel target: Apple TV · Linear · Notion Calendar · Raycast · Arc. Calm, warm,
minimal, elegant, human. Light mode by default; dark only on explicit opt-in.

### Palette (warm stone + soft coral)

Deliberately **not** the cream-and-terracotta look that reads as AI default. Warm
paper background, warm-gray stone neutrals, and a coral accent that leans coral
(pinker, softer) rather than clay.

| Token              | Value      | Use                                      |
| ------------------ | ---------- | ---------------------------------------- |
| Background         | `#FBFAF9`  | App background (warm paper)              |
| Foreground         | `#1C1917`  | Primary text (warm near-black)           |
| Muted              | `#F5F4F2`  | Cards, subtle fills                      |
| Muted foreground   | `#78716C`  | Secondary text                           |
| Border             | `#E7E5E4`  | Hairline dividers, card edges            |
| **Primary (coral)**| `#EC6A5E`  | The one accent — CTAs, presence, focus   |
| Primary hover      | `#D9584D`  | Pressed / hover                          |
| Coral wash         | `#FBEAE6`  | Soft coral background tint               |

Rule: coral is used **sparingly**. One accent, applied to the thing that matters
on each screen. Everything else stays quiet stone.

### Typography

- **Geist Sans** everywhere (via the `geist` package). Readable, elegant, modern.
- Type scale is intentional: large, tight display for hero; generous leading for
  emotional copy; small caps-tracked eyebrows for labels.
- Geist Mono only for data/room codes.

### Space & shape

- High whitespace. Rounded corners (`rounded-xl`/`rounded-2xl`). Subtle shadows
  only — never heavy or glowing. Hairline borders over drop shadows where possible.

### Motion (Framer Motion)

- Subtle, fast, purposeful. Page-load rise/fade on hero; scroll reveals; hover
  micro-interactions. Always respect `prefers-reduced-motion`. No ambient
  animation that doesn't serve meaning.

### Signature element

**Presence sync** — two named dots (host + guest) connected by a thin line,
sharing one playhead, gently pulsing in step. It embodies "same frame, same
moment, miles apart." It appears quietly on the landing hero and returns in the
room. This is the one memorable device; everything around it stays disciplined.

### Copy voice

Plain, warm, sentence case, active voice. Name things by what people control
("Start movie night", not "Create session"). Empty and error states give
direction, not mood. No filler, no cleverness over clarity.

---

## 4. Tech stack

- **Frontend:** Next.js 15 (App Router), TypeScript (strict), Tailwind CSS v3,
  shadcn/ui, Lucide icons, Framer Motion.
- **Backend / realtime:** Supabase (Postgres, Realtime, Storage for uploaded
  MP4s, optional anon auth for guest mode).
- **Sync:** Supabase Realtime channels broadcasting playback events
  (play/pause/seek + host heartbeat). Target drift < 500ms.
- **AI:** Gemini 2.5 Flash — scene explanation, character lookup, recap,
  discussion prompts. Contextual only; never a generic chatbot. Spoiler-safe to
  the current timestamp.
- **Onchain:** Monad testnet. A small Solidity contract (`MovieNightKeepsake`)
  read/written with `viem` + `wagmi`. Wallet interaction is isolated to the
  Summary feature.
- **Deploy:** Vercel.

---

## 5. Architecture (feature-based, not everything in `app/`)

```
app/                     Routes only (thin). Server Components by default.
  (marketing)/           Landing page
  room/[code]/           Movie room
components/
  ui/                    shadcn/ui primitives
  marketing/             Landing-page sections
  room/                  Player, sidebar, chat, reactions (built later)
hooks/                   Client hooks (useSync, useChannel, ...)
lib/                     cn, supabase client, gemini client, viem/wagmi setup
services/                Data + side-effect boundaries (rooms, summary, chain)
server/                  Server actions
types/                   Shared TypeScript types
utils/                   Pure helpers
constants/               Static config, copy, reaction sets
```

Standards: strict TypeScript, reusable components, no duplicated logic, server
actions where they fit, React Query only if genuinely needed, accessibility first,
responsive, no unnecessary dependencies.

---

## 6. Build order (feature by feature)

1. **Landing page** ✅ (this slice)
2. Room creation + guest identity (name, avatar color, room code, invite link/QR)
3. Video upload + synchronized playback (< 500ms drift)
4. Chat + typing indicator + floating reactions
5. AI companion (contextual, spoiler-safe)
6. Movie Night Summary + onchain keepsake mint

Each feature ships presentation-ready before the next begins.
