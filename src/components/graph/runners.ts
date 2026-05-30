"use client";

import { api } from "@/lib/client";
import type { NodeRunner } from "@/lib/graph/types";
import type { GenerateResult } from "@/lib/dto";

// Client-side runners for each node type. They call the existing API surface, so
// the executor stays a thin orchestration layer. When execution moves server-side
// (job worker), these become server functions with the same contract.

interface RenderedImage {
  url: string;
  provider: string;
  meta: Record<string, unknown>;
}

export const NODE_RUNNERS: Record<string, NodeRunner> = {
  scene: async (_ctx, _inputs, data) => {
    const sceneId = String(data.sceneId ?? "");
    if (!sceneId) throw new Error("Pick a scene in the Scene node.");
    return { scene: sceneId };
  },

  prompt: async (ctx, inputs, data) => {
    const sceneId = (inputs.scene as string | undefined) ?? undefined;
    const spec = await api.post<GenerateResult>(
      `/api/campaigns/${ctx.campaignId}/generate`,
      { sceneId, ai: Boolean(data.useAI) }
    );
    return { spec };
  },

  render: async (ctx, inputs, data) => {
    const spec = inputs.spec as GenerateResult | undefined;
    if (!spec) throw new Error("Connect a Prompt node into Render.");
    const image = await api.post<RenderedImage>(
      `/api/campaigns/${ctx.campaignId}/render`,
      {
        positive: spec.expandedPrompt || spec.shortPrompt,
        negative: spec.negativePrompt,
        width: Number(data.width ?? 1024),
        height: Number(data.height ?? 1024),
      }
    );
    return { image };
  },

  preview: async (_ctx, inputs) => {
    // Pass the image through so the node can display it.
    return { image: inputs.image };
  },
};
