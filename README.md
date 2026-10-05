# Pelli

**Movie nights, no matter the miles.** A shared-experience platform that lets
people watch a film together — same frame, same second — while apart.

Pelli is not a streaming service. It's a way to be on the same couch from two
cities. Its signature is *presence sync*: two named dots on one shared playhead.

Built for the Spark hackathon (BuildAnything · Monad testnet). See
[`rules.md`](./rules.md) for the engineering and design north star, including
the onchain plan.

## Status

| # | Feature                                        | State       |
| - | ---------------------------------------------- | ----------- |
| 1 | Landing page                                   | Done        |
| 2 | Room creation + guest identity (code, link, QR) | Done        |
| 3 | Video upload/link + synchronized playback      | Done        |
| 4 | Chat, typing indicator, floating reactions     | Done        |
| 5 | AI companion (contextual, spoiler-safe)        | Skipped     |
| 6 | Movie Night Summary + onchain keepsake mint    | Next        |

## Setup

Requires Node 20.9+ and pnpm.

```bash
pnpm install
```

### 1. Create a Supabase project

Rooms and presence live in Supabase. Create a free project at
[supabase.com](https://supabase.com), then:

1. Open the **SQL Editor** and run [`supabase/schema.sql`](./supabase/schema.sql).
   It creates the `rooms` and `participants` tables, their RLS policies, and
   adds both to the Realtime publication. It's safe to re-run.
2. Go to **Settings → API** and copy the project URL and the `anon` public key.

### 2. Configure the environment

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

Both are safe in the browser — access is governed by the RLS policies in
`supabase/schema.sql`, not by key secrecy.

### 3. Film storage (optional, for uploads)

Without this the app still works — hosts paste a link to a film instead. To let
hosts upload, create a [Cloudflare R2](https://developers.cloudflare.com/r2/)
bucket (keep it **private**) and:

1. **API token:** R2 → Manage API tokens → create one with *Object Read & Write*,
   scoped to just this bucket.
2. **CORS** (bucket → Settings → CORS policy), so the browser can upload and
   stream. List each origin exactly as a browser sends it — **no trailing slash**:
   ```json
   [{
     "AllowedOrigins": ["http://localhost:3000", "https://your-domain.example"],
     "AllowedMethods": ["PUT", "GET", "HEAD"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3600
   }]
   ```
3. **Lifecycle rule** (bucket → Settings → Object lifecycle rules): delete objects
   under the `rooms/` prefix after 1 day. The app deletes a film when the host
   ends the night; this is the backstop for nights that never end cleanly.
4. Add to `.env.local` (and to your host's environment variables):
   ```
   R2_ACCOUNT_ID=<Cloudflare account id>
   R2_ACCESS_KEY_ID=<token access key id>
   R2_SECRET_ACCESS_KEY=<token secret>
   R2_BUCKET=<bucket name>
   ```
   These are server-only secrets — never prefix them with `NEXT_PUBLIC_`.

### 4. Run it

```bash
pnpm dev
```

Open http://localhost:3000.

To try a real two-person room, open `/start` in one browser and paste the invite
link into a second browser (or a private window) — the lobby updates over
Realtime the moment the other person arrives.

## Architecture

Feature-based, not everything in `app/` (see rules.md §5):

```
app/                Routes only, thin. Server Components by default.
  start/            Create a room
  join/, join/[code]/   Enter a code / land from an invite or QR
  room/[code]/      The room
components/
  ui/               shadcn/ui primitives, retuned to the Pelli tokens
  marketing/        Landing sections
  room/             Identity, invite, presence, player + sync
hooks/              Client hooks (Realtime presence + playback sync)
lib/                cn, env, supabase clients, cookie session, origin
services/           Data boundary — the only place that touches the tables
server/             Server actions
types/  utils/  constants/
```

### Notable decisions

- **Tailwind v4.** The design tokens live in an `@theme` block in
  `app/globals.css` — v4 reads its theme from CSS, not a JS config. There is no
  `tailwind.config.ts`.
- **Light mode only,** by design. Pelli is a warm living room, not a console.
- **Identity is a name and a color.** No accounts, no email. The seat is held in
  an httpOnly cookie so the room renders server-side already knowing who you are.
- **A room holds up to 5 people, host included** (`constants/room.ts`). The cap,
  and one-color / one-name per room, are enforced by Postgres — a trigger that
  locks the room row, plus unique indexes — because a check-then-insert in app
  code is racy: two people joining at 4/5 would both pass it. The app checks
  first only to give a friendly answer early. Presence is drawn as everyone on
  one shared line, however many are here.
- **A room code is the credential**, the way a shared calendar link is. RLS is
  permissive by design and documented as such in `supabase/schema.sql`. Guessing
  a room means guessing 1 of ~729M codes.
- **The anon key is used server-side too.** Pelli has no accounts, so the server
  holds no privilege a code-holder lacks; that keeps RLS the single description
  of access.
- **Playback is host-authoritative.** The host's play/pause/seek broadcast over a
  Supabase Realtime channel; a heartbeat carries its position every 1.5s. Guests
  never broadcast — they apply events and hard-seek whenever they drift past
  0.5s. Everything reconciles on video *position*, never wall-clock, so the two
  machines' clocks don't matter (`hooks/use-playback-sync.ts`).
- **Films come from upload or link.** A pasted MP4/WebM link is played as-is.
  An upload goes straight from the host's browser to a *private* Cloudflare R2
  bucket, using a presigned URL the server only issues to the room's host
  (`server/upload-actions.ts`). The room stores just the object key, never a
  URL: each viewer asks the server for a short-lived signed one, which also
  proves they're seated in the room (`server/playback-actions.ts`). The server
  re-checks the real object's size after upload rather than trusting the
  browser, and deletes the film when the host ends the night. R2 has no egress
  fees, so a night's cost is storage for a day — cents — whatever the file size.
  The cap is one constant, `MAX_UPLOAD_BYTES` (500 MB); a single presigned PUT
  works up to 5 GB, past which uploads would need to become multipart.
- **Chat persists; typing and reactions are ephemeral.** Messages are stored and
  delivered over postgres_changes (history survives a refresh); typing pings and
  floating reactions ride broadcast for a snappy feel. Reactions are *also*
  written to a `reactions` table — that tally is what the Movie Night Summary's
  "top reactions" will draw on (Feature 6).

## Onchain

The Movie Night Summary (Feature 6) is minted as a keepsake on Monad testnet —
an immutable record of the night (film, participants, date, top reactions) that
both people keep. It is the product thesis made permanent, not crypto bolted on.
The core experience never blocks on a wallet. The contract is deployed on Monad testnet at: `0x5dfd273b1bf95f8f1df19d66d607ae9ada9c7946`.
