# Project Mnemosyne — Architecture Replan (rev. 2)

> Status: **proposal / for review.** Supersedes the "prompt generator only" MVP
> framing. Revised after direction decisions (see §0). Target: a **local-first,
> continuity-aware visual storytelling engine** with an **in-app node-graph
> editor** that turns campaign memory into **storyboard image sequences**.

---

## 0. Decisions locked in this revision

| Decision | Choice | Consequence |
| --- | --- | --- |
| Hardware target | **Modest NVIDIA GPU (8–12GB)** | Design around **SDXL + LoRA**; SDXL-Turbo/LCM for speed; Flux & video are **out of initial scope** |
| "ComfyUI-style" | **Full in-app node editor** (incl. diffusion-level nodes) | We own the canvas, graph, node set & executor end-to-end; the editor is 100% in-app |
| Diffusion compute | **Pluggable GPU kernel** behind the Render node | JS can't run CUDA; diffusion nodes compile to a headless **ComfyUI** runtime (invisible to the user) — swappable for an own-bundled Python sidecar later |
| Sequences | **Storyboard stills first** | A sequence = ordered, consistent **images**; no video models initially |
| Build order | **Editor first** | Build the in-app node editor against MockProvider now; wire real GPU rendering after |
| Canvas lib | **React Flow** | Mature MIT React canvas; we add node UIs + executor |
| Local stack | **ComfyUI + Ollama** | Headless ComfyUI as GPU kernel; Ollama for local text |

### The editor is fully in-app; only the GPU kernel is external

The node **editor** — canvas, graph format, node set (including diffusion-level
nodes), and execution engine — lives **entirely inside Mnemosyne**. The user never
opens another tool. The single thing that cannot live inside a JS process is the
**diffusion compute** itself (running SDXL weights on the GPU), because that needs
a native CUDA/torch runtime.

So the model is **in-app editor → compiled graph → GPU kernel**:

- **In-app (we build):** React Flow canvas, a typed Graph/Node/Edge model, a
  node-type registry spanning both *domain* nodes (Character, Scene, Prompt, Shot,
  Sequence) and *diffusion* nodes (Checkpoint, CLIP encode, KSampler, VAE,
  ControlNet, LoRA, IP-Adapter), and an executor.
- **GPU kernel (external process, invisible):** when the executor reaches diffusion
  nodes it **compiles them to a ComfyUI API graph** and submits to a **headless
  ComfyUI** running locally as a pure compute backend (no ComfyUI UI involved).
  This kernel is swappable for an own-bundled Python/diffusers sidecar later if we
  want zero third-party dependency.

This honors "everything in-app" for the UX while acknowledging the hard constraint
that GPU sampling needs a native runtime. We build the editor against a
`MockProvider` first (no GPU), so the whole thing is testable in a GPU-less env.

---

## 1. What changed and why

The MVP proved the brain: maintaining continuity and compiling evolving session
state into structured, spoiler-safe prompts. The new direction keeps that brain
and adds three things it was always a seam for:

1. **Render real images locally** (SDXL via ComfyUI / image provider).
2. **A node-graph editor** to compose and direct the generation pipeline visually.
3. **Storyboard sequences** — runs of consistent stills per beat.

### A distinction that shapes everything

- A **local LLM** (Ollama / LM Studio / llama.cpp / vLLM) generates **text** —
  prompts, event structuring, framing notes, shot breakdowns.
- An **image model** (SDXL + LoRA) generates **pictures**.
- A **storyboard sequence** is many images rendered with **consistency**.

The LLM and image engines are separate providers, wired differently. We keep them
decoupled.

### Design principles

- **Local-first, offline-capable.** Nothing requires a cloud API.
- **Domain graph in-app; diffusion delegated.** Build the high-level node canvas;
  delegate SD to ComfyUI/provider (§0).
- **Deterministic core stays.** State→prompt always works with no model; a graph
  with just memory+Prompt nodes runs fully offline. Models are pluggable.
- **Continuity is the product.** Identity persists across renders via reference
  images, stable seeds, per-character **LoRA**, **IP-Adapter**, **ControlNet** —
  orchestrated by us, executed by the renderer.
- **Provider abstraction.** `LLMProvider` and `ImageProvider` are interfaces with
  local + cloud + **mock** implementations (mock = full pipeline runs with no GPU,
  essential for CI and the GPU-less dev container).

---

## 2. Target architecture (layers)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 8. Presentation: domain forms UI  +  NODE-GRAPH EDITOR  +  storyboard    │
├────────────────────────────────────────────────────────────────────────┤
│ 7. Graph engine: Graph/Node/Edge model, node-type registry, executor     │
│        (topo-sort, typed ports, async nodes → render/LLM jobs)           │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Sequence layer: Sequence → Shots; storyboard run with continuity      │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Consistency (cross-cutting): seeds, reference art→IP-Adapter,         │
│        composition refs→ControlNet, per-character LoRA, render feedback   │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Generation orchestration: RenderSpec → jobs → providers; job queue    │
│        ├─ LLMProvider   (Ollama / OpenAI-compatible / mock)             │
│        └─ ImageProvider (ComfyUI workflow templates / mock)             │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Direction: memory → RenderSpec (deterministic + LLM-assisted)         │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Domain / Memory: campaigns, characters, locations, scenes, events,    │
│        corrections, references, sequences, assets, graphs  (mostly built) │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Storage: SQLite (metadata) + content-addressed asset store (files)    │
└────────────────────────────────────────────────────────────────────────┘
```

### Layer 1 — Storage
- **SQLite/Prisma** for metadata.
- **Asset store:** generated images live on disk, content-addressed
  (`public/generated/<sha256>.<ext>`, git-ignored), tracked by an `Asset` row.
  Keeps the DB lean and enables a feedback loop (a render can become a reference).

### Layer 2 — Domain / Memory (extends existing)
Existing models stay. Additions:
- `Asset` — stored image + metadata (provider, model, seed, dims, workflowId,
  sourceShotId).
- `Sequence` — ordered `Shot`s for a beat/scene/act.
- `Shot` — scene-state snapshot + its `RenderSpec` + resulting `Asset`(s).
- `RenderJob` — async job (status, progress, error, provider, outputs).
- `Graph` — a saved node graph (nodes+edges JSON) scoped to a campaign/sequence;
  plus `GraphRun` history.
- `Character`/`Location` gain optional consistency handles: `seed`, `loraRef`,
  `ipAdapterAssetId`.

### Layer 3 — Direction (extend the existing generator)
`generatePrompt()` becomes the engine behind a **Prompt node** and emits a
**`RenderSpec`** (superset of today's text output):
```ts
interface RenderSpec {
  positive: string; negative: string;
  width: number; height: number;
  seed?: number; steps?: number; cfg?: number; sampler?: string;
  model?: string;                      // e.g. an SDXL checkpoint name
  loras?: { name: string; weight: number }[];
  references: { assetId?: string; url?: string;
                role: 'ip-adapter' | 'controlnet-pose' | 'controlnet-depth' | 'style' }[];
  workflowId: string;                  // which ComfyUI template to fill
  continuityNotes: string[]; spoilerWarnings: string[];
}
```
Deterministic build from memory; LLM-assist refines prose; a vision model can
derive composition from a scene reference screenshot.

### Layer 4 — Generation orchestration
- **`LLMProvider`**: `chat()`, `structured()`, optional `vision()`. Impls:
  `OllamaProvider`, `OpenAICompatibleProvider` (existing logic; covers
  LM Studio/vLLM/cloud), `MockProvider`.
- **`ImageProvider`**: `txt2img()`, `img2img()`, `capabilities()`. Impls:
  `ComfyUIProvider` (primary), `MockProvider` (placeholder render, no GPU).
- **ComfyUI = parameterized workflow templates.** Store SDXL workflow **JSON**;
  inject prompt/seed/dims/lora/refs into known node ids; POST to `/prompt`; stream
  progress over the websocket; fetch results from `/history` + `/view`.
- **Async jobs.** Renders take seconds–minutes → enqueue a `RenderJob`; a worker
  drives the provider; progress streamed to the UI (SSE/poll). Process model §4.

### Layer 5 — Consistency (cross-cutting)
The differentiator, tuned for a modest GPU:
- **Per-character LoRA** (when available) for face/identity lock; else…
- **IP-Adapter** from the character's reference art (already captured).
- **ControlNet** (OpenPose/Depth) from the scene composition reference (already
  captured) for framing & orientation.
- **Stable per-entity seeds** to reduce drift.
- **Feedback loop:** an approved canonical render becomes a future reference.
- **Corrections** keep injecting positives + negatives (already built).

### Layer 6 — Sequence layer (storyboard)
- `Sequence` = ordered `Shot`s; "Run storyboard" renders each shot carrying
  continuity (same characters/refs/seed strategy) so the run reads as one piece.
- An LLM "shot breakdown" assist proposes Shots from a scene + recent events.
- Stills only; video is a later, explicitly-deferred phase.

### Layer 7 — Graph engine (new, core)
- **Model:** `Graph` = `{ nodes: Node[], edges: Edge[] }`. Each `Node` has a
  `type`, position, and params; ports are **typed** (Entity, EntityList,
  RenderSpec, ImageAsset, Sequence, Text).
- **Node-type registry:** Campaign Style · Character · Location · Scene · Events ·
  Corrections · Prompt · LLM(Structure / Shot-breakdown / Framing-from-image) ·
  **Render** · Shot · Sequence/Storyboard · Reference(out) · Seed/Reference(in).
- **Executor:** validate types → topological sort → run nodes; pure nodes run
  inline, **async nodes (LLM, Render) become jobs**; results cached per `GraphRun`.
  Re-running only recomputes dirty downstream nodes.

### Layer 8 — Presentation
- **Forms UI stays** for editing memory (campaigns/characters/…); it's the fastest
  way to maintain canon.
- **Node-graph editor** (React Flow) is the **generation/direction surface**:
  drag memory + render nodes, wire them, run the graph, watch jobs, get a
  storyboard. Memory nodes read the same DB entities the forms edit.
- **Storyboard timeline** view for sequence output + per-shot approve/regenerate.

---

## 3. How the node editor stays tractable

- **Use React Flow** for the canvas, selection, edges, minimap — we do not build
  canvas/drag/zoom from scratch. We supply node React components + an execution
  engine (React Flow only renders the graph; it doesn't run it).
- **Domain-level nodes only** (§0). A Render node owns a small set of params and a
  `workflowId`; the SD complexity lives in the ComfyUI template, not our canvas.
- **Coexist, don't replace.** Forms remain for canon editing; the graph is for
  composing generation. No big-bang UI rewrite.
- **Templated starter graphs.** Ship a default "single scene → render" graph and a
  "scene → storyboard" graph so users aren't staring at a blank canvas.

> Honest scope note: the graph engine + node UIs are the **largest** part of this
> plan. React Flow removes the canvas burden, but the typed executor, ~12 node
> types, and job integration are real work — this is the multi-phase centerpiece.

---

## 4. Process model (unchanged recommendation)

Local renders are long-running and ill-suited to Next request handlers.
- **(a) Single Next app + in-process worker + `RenderJob` table.** Simplest to run;
  good for single-user local. **Start here.**
- **(b) Separate Node worker process** (same repo/Prisma) when renders get heavy.
- **(c) Queue (BullMQ/Redis) / Python companion.** Defer unless needed.

ComfyUI (`:8188`) and Ollama (`:11434`) run as external local services; Mnemosyne
talks to them over HTTP/ws regardless.

---

## 5. Phased migration (revised; node editor is now central)

Each phase ships working software.

- **Phase 0 — Providers + local LLM.** Extract `LLMProvider`; add `OllamaProvider`;
  document local models. (Small; mostly refactor + docs.)
- **Phase 1 — Image render (no graph yet).** `ImageProvider` + `MockProvider` +
  `ComfyUIProvider` (SDXL txt2img template); `RenderSpec`; `Asset` store;
  `RenderJob` + in-process worker; render a single scene from current state and
  save the image as a reference. Verifiable here via MockProvider. (Medium.)
- **Phase 2 — Consistency.** Wire reference art→IP-Adapter, composition
  ref→ControlNet, per-entity seeds, LoRA hooks, render→reference feedback. (Medium.)
- **Phase 3 — Node-graph editor (core).** React Flow canvas; Graph/Node/Edge model
  + typed executor; memory + Prompt + Render nodes; run a graph → image. Ship the
  "single scene → render" starter graph. (Large.)
- **Phase 4 — Storyboard sequences.** Sequence/Shot nodes + storyboard timeline;
  batch render with continuity; LLM shot-breakdown node; "scene → storyboard"
  starter graph. (Medium–large.)
- **Phase 5 — Job robustness.** Live progress (SSE/ws), cancel/retry, model (b) if
  needed. (Cross-cutting.)
- **Phase 6 (deferred) — Video.** AnimateDiff/SVD workflow as a Render-node mode.

> Note: Phases 1–2 deliver real rendering *before* the big editor build, so value
> lands early and the node editor has working render/LLM nodes to wire on day one.

---

## 6. What's reused vs new vs changed

| Reused (keep) | New (build) | Changed |
| --- | --- | --- |
| Domain models, memory, spoiler logic | Provider interfaces (LLM/Image) + mocks | `imageGen.ts` stub → `ImageProvider` |
| Deterministic prompt generator | `RenderSpec` + Direction extension | `/generate` → emits spec / enqueues |
| Corrections, reference art, scene refs | Asset store (content-addressed) | Generation becomes **async** (jobs) |
| OpenAI-compatible client → a provider | `RenderJob` + worker (model a) | DB gains Asset/Sequence/Shot/Job/Graph |
| API + UI patterns, JSON helpers | Consistency wiring (IP-Adapter/CN/LoRA) | UI gains node editor + storyboard |
| Forms UI (for canon editing) | **Graph model + typed executor** | |
| | **Node-graph editor (React Flow) + node UIs** | |
| | Sequence/storyboard layer | |

The brain is preserved; the replan adds an execution spine and a directing canvas.

---

## 7. Open decisions (need input before building)

1. **Confirm the two-level graph** (domain nodes in-app; diffusion delegated to
   ComfyUI) vs a true diffusion-level node editor in-app (much larger, redundant
   with ComfyUI). *Recommended: two-level.*
2. **React Flow** as the canvas library? (MIT, React, mature.) Any preference
   otherwise (e.g. Rete.js, litegraph.js)?
3. **Render before editor (Phases 1–2 first), or editor-first?** *Recommended:
   render first*, so the node editor has working nodes to compose.
4. **Do you run ComfyUI + Ollama already, and on which host/ports?** (For the
   provider defaults.)
5. **Model defaults** for a modest GPU — pin an SDXL checkpoint + an SDXL-Turbo/LCM
   fast path? Any specific checkpoints/LoRAs you want as defaults?
6. **Dev-container reality:** no GPU here, so we build provider interfaces +
   `MockProvider` (fully testable) in this environment; real SDXL/ComfyUI/Ollama
   integration is verified on your machine. Confirm.

---

## 8. Recommendation

Adopt the **two-level graph** model on a modest-GPU **SDXL + LoRA** stack, process
model **(a)**, and execute **Phases 0 → 1 → 2 → 3 → 4**: local LLM → real
single-scene render → consistency → **node-graph editor** → **storyboard
sequences**. This preserves the entire existing brain, lands real renders early,
and delivers the in-app node editor as the centerpiece — without reimplementing
ComfyUI's diffusion internals.
