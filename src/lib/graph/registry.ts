import type { NodeDef } from "./types";

// Node-type definitions (pure metadata — no execution logic here). The executor
// pairs these with runners (see src/components/graph/runners.ts). This registry
// is intentionally extensible: diffusion-level nodes (Checkpoint, KSampler,
// ControlNet, LoRA, …) get added here as the GPU kernel integration lands.

export const NODE_DEFS: Record<string, NodeDef> = {
  scene: {
    type: "scene",
    title: "Scene",
    category: "memory",
    description: "Select a scene from campaign memory as the source state.",
    inputs: [],
    outputs: [{ id: "scene", label: "scene", type: "scene" }],
    defaultData: { sceneId: "" },
  },
  prompt: {
    type: "prompt",
    title: "Prompt",
    category: "prompt",
    description:
      "Compile the scene's current state into a RenderSpec (short/expanded/negative prompt + continuity).",
    inputs: [{ id: "scene", label: "scene", type: "scene" }],
    outputs: [{ id: "spec", label: "spec", type: "spec" }],
    defaultData: { useAI: false },
  },
  render: {
    type: "render",
    title: "Render",
    category: "render",
    description:
      "Render an image from a RenderSpec. Uses the configured image provider (MockProvider until a GPU kernel is wired).",
    inputs: [{ id: "spec", label: "spec", type: "spec" }],
    outputs: [{ id: "image", label: "image", type: "image" }],
    defaultData: { width: 1024, height: 1024 },
  },
  preview: {
    type: "preview",
    title: "Preview",
    category: "output",
    description: "Display a rendered image.",
    inputs: [{ id: "image", label: "image", type: "image" }],
    outputs: [],
    defaultData: {},
  },
};

export const NODE_LIST: NodeDef[] = Object.values(NODE_DEFS);

export function getNodeDef(type: string): NodeDef | undefined {
  return NODE_DEFS[type];
}
