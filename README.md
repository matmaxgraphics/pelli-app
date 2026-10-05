# Pelli

**Movie nights, no matter the miles.** A shared-experience platform that lets
people watch a film together — same frame, same second — while apart.

Pelli is not a streaming service. It's a way to be on the same couch from
different cities. Its signature is *presence sync*: everyone in the room on one
shared line, on one shared playhead.

Built for the Spark hackathon (BuildAnything · Monad testnet). See
[`rules.md`](./rules.md) for the original engineering and design north star.

## What you can do

1. **Start a movie night** — pick a name and a color. No account, no email.
2. **Invite up to four people** with a room code, a link, or a QR code.
3. **Choose the film** — upload one (up to 500 MB) or paste a link.
4. **Watch in step.** Play, pause and seek follow the host; everyone stays on the
   same second.
5. **Talk through it** — live chat, typing indicators, and reactions that float
   over the film.
6. **Keep the night.** When the host ends it, everyone lands on a Summary (who
   was there, the top reaction, how much was said), and anyone can mint it as a
   permanent keepsake on Monad.

## Status

| # | Feature                                          | State   |
| - | ------------------------------------------------ | ------- |
| 1 | Landing page                                     | Done    |
| 2 | Room creation + guest identity (code, link, QR)  | Done    |
| 3 | Video upload/link + synchronized playback        | Done    |
| 4 | Chat, typing indicator, floating reactions       | Done    |
| 5 | AI companion (contextual, spoiler-safe)          | Skipped |
| 6 | Movie Night Summary + onchain keepsake mint      | Done    |

Since the hackathon: rooms hold up to **5 people** (was 2), and films are stored
in **private Cloudflare R2** behind signed URLs (was a public bucket).

## Onchain

The Movie Night Summary is minted as an ERC-721 keepsake on **Monad testnet** —
an immutable record of the night (film, who watched, date, top reaction). The
metadata is built entirely on-chain as a base64 data URI, so there is no
off-chain server or IPFS pin that can rot. It's optional and end-of-night: the
core experience never blocks on a wallet.

| | |
| --- | --- |
| Contract | `MovieNightKeepsake` ([source](./contracts/MovieNightKeepsake.sol)) |
| Network | Monad testnet (chain id `10143`) |
| Address | [`0x5dfd273b1bf95f8f1df19d66d607ae9ada9c7946`](https://testnet.monadexplorer.com/address/0x5dfd273b1bf95f8f1df19d66d607ae9ada9c7946) |
| Token | `Pelli Movie Night` (`PELLI`) |

Minting happens in the browser with `viem` over the injected wallet (MetaMask):
it connects, switches to Monad testnet (adding it if needed), and calls
`mintMovieNight`. The flow lives in [`lib/chain/keepsake.ts`](./lib/chain/keepsake.ts)
and nothing else in the app imports it.

## Setup

Requires Node 20.9+ and pnpm.

```bash
pnpm install
```

### 1. Create a Supabase project

Rooms, presence, chat and reactions live in Supabase. Create a project at
[supabase.com](https://supabase.com), then:

1. Open the **SQL Editor** and run [`supabase/schema.sql`](./supabase/schema.sql).
   It creates the tables, their policies, the room-capacity trigger, and the
   Realtime publication. It's idempotent: safe to re-run after any update.
2. Go to **Settings → API** and copy the project URL and the `anon` public key.

> Free Supabase projects **pause after a week of inactivity**. A paused project
> stops resolving entirely, so the app can't create or join rooms. If that
> happens, restore the project from the dashboard before debugging anything else.

### 2. Configure the environment

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

### 3. Film storage (optional, for uploads)

Without this the app still works — hosts paste a link to a film instead. To let
hosts upload, create a [Cloudflare R2](https://developers.cloudflare.com/r2/)
bucket (keep it **private**) and:

1. **API token:** R2 → Manage API tokens → create one with *Object Read & Write*,
   scoped to just this bucket.
2. **CORS** (bucket → Settings → CORS policy), so the browser can upload and
   stream. List every origin you serve the app from, exactly as a browser sends
   it — **no trailing slash**:
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

### 4. The keepsake contract (optional)

To use the deployed contract above, set it in `.env.local`:

```
NEXT_PUBLIC_KEEPSAKE_ADDRESS=0x5dfd273b1bf95f8f1df19d66d607ae9ada9c7946
```

Without it the Summary shows the keepsake as "coming online" and everything else
works. To deploy your own copy instead:

```bash
node scripts/compile-and-deploy.js --compile-only   # compile check, no key needed
```

Then put a funded deployer key in `.env.local` (testnet MON from
[faucet.monad.xyz](https://faucet.monad.xyz)) and run the script without the
flag. It records the new address in `.env.local` for you.

```
DEPLOYER_PRIVATE_KEY=0x...   # never commit this; .env.local is git-ignored
```

### 5. Run it

```bash
pnpm dev
```

Open http://localhost:3000. To try a real room, open `/start` in one browser and
paste the invite link into others — a second browser, a private window, or a
phone. The lobby updates over Realtime the moment someone arrives.

## Deploying

On Vercel (or similar), set the same environment variables as `.env.local`:
the two Supabase values, the four `R2_*` values, and
`NEXT_PUBLIC_KEEPSAKE_ADDRESS`. Then:

- Add your deployed origin to the R2 **CORS** rule (no trailing slash), or
  uploads from the live site will be blocked.
- Redeploy after changing environment variables — they're read at build/start.

## Architecture

Feature-based, not everything in `app/` (see rules.md §5):

```
app/                Routes only, thin. Server Components by default.
  start/            Create a room
  join/, join/[code]/   Enter a code / land from an invite or QR
  room/[code]/      The room: lobby → player → summary
components/
  ui/               shadcn/ui primitives, retuned to the Pelli tokens
  marketing/        Landing sections
  room/             Identity, invite, presence, player, chat, summary, mint
hooks/              Client hooks: live room, playback sync, chat, reactions,
                    video source, summary stats, keepsake mint
lib/                cn, env, cookie session, room access (seat checks), origin,
                    Supabase clients, R2 settings, direct-to-R2 upload
  chain/            Monad config + the mint flow (the only place that touches a wallet)
services/           Data boundary: rooms, messages, and film storage (R2)
server/             Server actions: join/create, film choice + upload, end night
contracts/          MovieNightKeepsake.sol
scripts/            compile-and-deploy.js
supabase/           schema.sql — the single, idempotent source of the database
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
  first only to give a friendly answer early.
- **Playback is host-authoritative.** The host's play/pause/seek broadcast over a
  Supabase Realtime channel; a heartbeat carries its position every 1.5s. Guests
  never broadcast — they apply events and hard-seek whenever they drift past
  0.5s. Everything reconciles on video *position*, never wall-clock, so the
  machines' clocks don't matter (`hooks/use-playback-sync.ts`).
- **Films come from upload or link.** A pasted MP4/WebM link is played as-is.
  An upload goes straight from the host's browser to a *private* R2 bucket,
  using a presigned URL the server only issues to the room's host
  (`server/upload-actions.ts`). The room stores just the object key, never a
  URL: each viewer asks the server for a short-lived signed one, which also
  proves they're seated in the room (`server/playback-actions.ts`). The server
  re-checks the real object's size after upload rather than trusting the
  browser, and deletes the film when the host ends the night. R2 has no egress
  fees, so a night costs cents of storage whatever the file size. The cap is one
  constant, `MAX_UPLOAD_BYTES` (500 MB); a single presigned PUT works up to
  5 GB, past which uploads would need to become multipart.
- **Chat persists; typing and reactions are ephemeral.** Messages are stored and
  delivered over postgres_changes (history survives a refresh); typing pings and
  floating reactions ride broadcast for a snappy feel. Reactions are *also*
  written to a `reactions` table — that tally is the Summary's "top reaction",
  and the value minted on-chain.
- **Pelli keeps the memory, not the movie.** Ending the night deletes the film;
  the Summary and the on-chain keepsake are what remain.
- **`viem` without `wagmi`** for the mint. rules.md planned both; this is one
  isolated button, and a plain wallet client keeps the whole flow in one file
  with nothing app-wide to misconfigure.

## Trust model and known limits

Pelli is built for a handful of friends, and it's honest about what that means:

- **The database is open to anyone holding the public anon key.** There are no
  accounts, so row-level security can't tell people apart: the policies are
  permissive by design (documented in `supabase/schema.sql`). A room code is a
  long, hard-to-guess way *in*, but it is not a secret from the database —
  someone with the anon key (which ships in the browser bundle) can list rooms
  and read their chat. Host-only actions (choosing the film, ending the night)
  are enforced in the server actions, not in the database.
- **Films are the exception: they're properly private.** The bucket is private,
  uploads need a host-issued signed URL, viewing needs a signed URL issued only
  to someone seated in the room, and the file is deleted when the night ends.
- **Before opening Pelli to the public** the gaps to close are: scope database
  access per room (short-lived tokens plus RLS instead of a shared anon key),
  rate-limit room creation and uploads, and add terms and a takedown process,
  since hosts upload files Pelli can't vet.
- **Free-tier Supabase pauses** when idle (see Setup).

## Roadmap

- AI companion — contextual, spoiler-safe scene and character help (skipped for
  time).
- Bring-your-own-file mode: each person plays their own copy and Pelli syncs only
  the clock — no upload, no storage, no hosting.
- Video providers beyond a file: YouTube and Vimeo, behind a common player
  interface.
