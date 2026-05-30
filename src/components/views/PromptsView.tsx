"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { SharedProps } from "@/components/Workspace";
import type { PromptDTO } from "@/lib/dto";
import { parseList } from "@/lib/json";
import GeneratePanel from "@/components/GeneratePanel";

export default function PromptsView({ campaignId, core, status }: SharedProps) {
  const [prompts, setPrompts] = useState<PromptDTO[]>([]);

  const load = useCallback(async () => {
    setPrompts(await api.get<PromptDTO[]>(`/api/campaigns/${campaignId}/prompts`));
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this saved prompt?")) return;
    await api.del(`/api/prompts/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-stone-100">Visual Prompts</h2>

      <div className="card">
        <h3 className="mb-3 font-medium text-ember-400">Generate from current state</h3>
        {!core.activeScene && (
          <p className="mb-3 text-sm text-amber-300">
            No active scene — the generator will use all active characters and no
            location. Set a Current Scene for best results.
          </p>
        )}
        <GeneratePanel
          campaignId={campaignId}
          sceneId={core.activeScene?.id ?? null}
          aiAvailable={status.aiEnabled}
          onSaved={load}
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-stone-300">Saved prompts ({prompts.length})</h3>
        {prompts.length === 0 && (
          <p className="text-sm text-stone-500">
            No saved prompts yet. Generate one and click “Save prompt”.
          </p>
        )}
        {prompts.map((p) => (
          <div key={p.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="pill">{p.source}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">
                  {new Date(p.createdAt).toLocaleString()}
                </span>
                <button className="btn-ghost text-xs" onClick={() => remove(p.id)}>
                  Delete
                </button>
              </div>
            </div>
            <p className="text-sm text-stone-200">{p.shortPrompt}</p>
            <details className="text-sm text-stone-400">
              <summary className="cursor-pointer text-xs text-stone-500">
                Expanded + details
              </summary>
              <p className="mt-2 whitespace-pre-wrap">{p.expandedPrompt}</p>
              {p.negativePrompt && (
                <p className="mt-2 text-xs text-stone-500">
                  Negative: {p.negativePrompt}
                </p>
              )}
              {parseList(p.spoilerWarnings).length > 0 && (
                <p className="mt-1 text-xs text-amber-300">
                  Spoiler warnings: {parseList(p.spoilerWarnings).join("; ")}
                </p>
              )}
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
