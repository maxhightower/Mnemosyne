# Project Mnemosyne

**An AI-assisted visual storytelling companion for tabletop RPGs — starting with Dungeons & Dragons.**

Mnemosyne is a *live campaign illustrator*. It is **not** a real-time video
generator. It takes structured session notes, character/location descriptions,
dice outcomes, and DM input, maintains campaign **continuity**, and produces
polished **image-generation prompts** the DM can paste into any image model.

> The MVP exists to prove one thing: *Can we maintain campaign continuity and
> generate useful visual prompts from evolving D&D session state?* — Yes.

---

## Highlights

- **Deterministic prompt generator** that always works, with **no API key** and
  **no network**. AI is a bonus, never a requirement.
- **Spoiler protection by construction**: private DM notes, character secrets,
  hidden location features, and scene "hidden information" are *never* placed in
  a prompt unless the DM explicitly toggles **reveal** on the scene.
- **Correction memory**: DM corrections persist and are folded into every future
  prompt. Phrases like *"never black armor"* automatically become negative-prompt
  exclusions.
- **Campaign memory model**: campaigns, characters, NPCs/monsters, locations, the
  current scene, a session event log, generated prompts, and canonical references.
- **Character reference art**: attach canonical art to a character by uploading an
  image or pasting a URL. When present, prompts gain a *"must match the provided
  canonical reference art"* continuity note, and the URLs are carried to the AI
  path — readying the seam for future img2img reference conditioning.
- Optional, drop-in **AI** (OpenAI-compatible) for event structuring and richer
  prompts, and a stubbed **image generation** seam for later.

---

## Tech Stack

| Layer     | Choice                                            |
| --------- | ------------------------------------------------- |
| Framework | Next.js 14 (App Router) + React 18 + TypeScript   |
| Styling   | Tailwind CSS                                      |
| Backend   | Next.js Route Handlers (`src/app/api/**`)         |
| Database  | SQLite via Prisma (portable to Postgres)          |
| AI        | Optional OpenAI-compatible Chat Completions API   |
| Auth      | None (single-user local MVP)                      |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure env (SQLite path; AI keys optional)
cp .env.example .env

# 3. Generate Prisma client, create the DB, and seed the demo campaign
npm run setup
#   (equivalent to: prisma generate && prisma db push && npm run db:seed)

# 4. Run
npm run dev
# open http://localhost:3000
```

You'll land on the **Campaign Dashboard** with a seeded campaign,
**"The Stolen Sun"**, ready to explore.

### Useful scripts

| Script              | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Start the dev server                              |
| `npm run build`     | Production build + typecheck                      |
| `npm run setup`     | Generate client, push schema, seed demo data      |
| `npm run db:seed`   | (Re)seed the demo campaign                        |
| `npm run db:reset`  | Wipe the DB and re-seed                           |

### Enabling AI (optional)

Set these in `.env` and the app automatically prefers AI for event structuring,
and exposes a **"Use AI"** toggle on the generate panel:

```env
OPENAI_API_KEY="sk-..."
OPENAI_BASE_URL="https://api.openai.com/v1"   # or any compatible endpoint
OPENAI_MODEL="gpt-4o-mini"
```

If the key is missing or a call fails, the app **falls back to the deterministic
generator** — nothing breaks.

---

## The MVP Demo Flow

The seeded data already represents this flow; you can also reproduce it by hand:

1. Create a campaign (**The Stolen Sun** is seeded).
2. Add characters (**Thorne**, **Mira**, **Skeletal Knight**).
3. Add a location (**The Flooded Crypt**).
4. Set the **Current Scene** using that location + those characters.
5. Add session events (scene change, combat, attack).
6. Click **Generate Scene Prompt** → short + expanded prompts.
7. **Save as Canonical**.
8. Add a **Correction** (e.g. *"Mira casts blue fire, never red fire."*).
9. **Generate** again → the new prompt reflects the correction
   (*blue fire* in continuity, *red fire* in the negative prompt).

---

## Architecture

```
src/
├─ app/
│  ├─ page.tsx                 # Campaign dashboard (selector + create)
│  ├─ campaigns/[id]/page.tsx  # Workspace shell
│  └─ api/                     # Route handlers (REST-ish)
│     ├─ campaigns/[...]       # campaign + nested characters/locations/scenes/
│     │                        #   events/corrections/prompts/references/generate
│     ├─ characters/[id]       # item update/delete
│     ├─ locations/[id]
│     ├─ scenes/[id]
│     ├─ events/[id]
│     ├─ corrections/[id]
│     ├─ prompts/[id]
│     ├─ references/[id]
│     └─ status                # capability probe (aiEnabled, imageGenEnabled)
├─ components/
│  ├─ Workspace.tsx            # sidebar + view router
│  ├─ GeneratePanel.tsx        # generate → review → save prompt/canonical
│  ├─ forms.tsx                # small form primitives
│  └─ views/                   # one component per sidebar section
└─ lib/
   ├─ db.ts                    # Prisma client singleton
   ├─ types.ts                 # generator-facing state shapes
   ├─ dto.ts                   # client-facing API shapes
   ├─ mappers.ts               # Prisma record -> state
   ├─ json.ts                  # JSON-string column helpers
   ├─ buildPromptInput.ts      # assemble full state for a scene
   ├─ promptGenerator.ts       # ★ deterministic prompt builder (pure)
   ├─ structureFallback.ts     # deterministic event structurer
   ├─ ai.ts                    # optional OpenAI-compatible AI + smart fallback
   └─ imageGen.ts              # stubbed image generation seam
prisma/
├─ schema.prisma              # data model
└─ seed.ts                    # "The Stolen Sun" demo data
```

### Prompt generation pipeline

```
DB state ──buildPromptInput──▶ PromptGenInput ──┬─ generatePrompt()      (deterministic, always)
                                                └─ generatePromptAI()    (optional, OpenAI)
                                                        │
                                                        ▼
                                  { shortPrompt, expandedPrompt, negativePrompt,
                                    continuityNotes[], spoilerWarnings[], source }
```

Both paths return the **same shape**. `generatePromptSmart()` prefers AI when a
key is present and silently falls back to deterministic on any error.

### Spoiler protection (how it's enforced)

- The **deterministic** generator simply never reads `secrets`, `privateNotes`,
  `hiddenFeatures`, or scene `hiddenInformation` into the prompt unless
  `scene.revealHidden === true`; instead it emits a **spoiler warning** so the DM
  knows something was withheld.
- The **AI** path builds a *spoiler-filtered* copy of the state *before* sending
  it to the model, so secrets aren't even transmitted unless revealed — and the
  system prompt reinforces the rule.

### Data models

`Campaign`, `Character`, `Location`, `Scene`, `SessionEvent`, `VisualPrompt`,
`VisualReference`, `Correction` (see `prisma/schema.prisma`). List/object fields
(signature items, present-character ids, mechanical results, continuity notes)
are stored as **JSON-encoded strings** for SQLite portability; `src/lib/json.ts`
encodes/decodes them. Moving to PostgreSQL later is a `datasource` change plus an
optional migration of those columns to native JSON.

---

## TODOs / Future Phases

These are intentionally **out of scope** for the MVP and marked in code:

- **Image generation** — `src/lib/imageGen.ts` is the seam. Wire a provider
  (OpenAI Images, Stability, Replicate, local ComfyUI/A1111), persist the image,
  and store the URL on `VisualReference.imageUrl`. Set `IMAGE_GEN_ENABLED=true`.
  - *Consistency*: a character's **reference art** (`Character.canonicalImageRefs`,
    editable in the Characters view via upload or URL) is the seam for this — feed
    those images back as reference/init images so characters stay visually stable
    across scenes. Uploaded files are stored under `public/uploads/` (git-ignored;
    lost on container reset — paste a hosted URL for durable references).
- **Live speech transcription + speaker diarization** — auto-create session
  events from audio (currently events are added manually).
- **Discord bot** input and a **Foundry VTT** module / **Roll20** / **D&D Beyond**
  character import.
- **Vector / long-term memory** for very long campaigns (currently recent-events
  windowing).
- **Scene graph**, **DM preview mode**, **player requests**, **session recap
  video**, animated scene cards.
- **Multi-user auth & permissions** (MVP is single-user/local).

---

## Notes

- No authentication — this is a local, single-user MVP.
- The SQLite file (`prisma/dev.db`) is git-ignored; run `npm run setup` to create
  and seed it.
