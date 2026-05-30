"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { SharedProps } from "@/components/Workspace";
import type { ReferenceDTO } from "@/lib/dto";
import { parseList } from "@/lib/json";

export default function ReferencesView({ campaignId, status }: SharedProps) {
  const [refs, setRefs] = useState<ReferenceDTO[]>([]);

  async function load() {
    setRefs(await api.get<ReferenceDTO[]>(`/api/campaigns/${campaignId}/references`));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function remove(id: string) {
    if (!confirm("Delete this reference?")) return;
    await api.del(`/api/references/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-stone-100">Canonical References</h2>
      <p className="text-sm text-stone-400">
        Approved prompts (and, once image generation is wired up, images) saved as the
        campaign’s canonical visual record. Save these from the Current Scene or Visual
        Prompts views.
        {!status.imageGenEnabled &&
          " Image generation is disabled — references store prompt text only."}
      </p>

      <div className="space-y-3">
        {refs.length === 0 && (
          <p className="text-sm text-stone-500">No canonical references yet.</p>
        )}
        {refs.map((r) => (
          <div key={r.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {r.approvedByDm && (
                  <span className="pill border-emerald-700/50 bg-emerald-950/40 text-emerald-300">
                    DM-approved
                  </span>
                )}
                {r.relatedLocation && <span className="pill">{r.relatedLocation}</span>}
                {parseList(r.relatedCharacters).map((c) => (
                  <span key={c} className="pill">
                    {c}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
                <button className="btn-ghost text-xs" onClick={() => remove(r.id)}>
                  Delete
                </button>
              </div>
            </div>
            {r.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.imageUrl}
                alt="canonical reference"
                className="max-h-80 rounded-md border border-ink-700"
              />
            ) : null}
            <p className="whitespace-pre-wrap text-sm text-stone-200">{r.promptText}</p>
            {r.notes && <p className="text-xs text-stone-500">{r.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
