"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { SharedProps } from "@/components/Workspace";
import type { EventDTO, StructuredEventResult } from "@/lib/dto";
import { EVENT_TYPES } from "@/lib/dto";
import { parseList, parseObject } from "@/lib/json";
import { Field, TextInput, TextArea, Select, Checkbox } from "@/components/forms";

interface Draft {
  speaker: string;
  eventType: string;
  rawText: string;
  structuredSummary: string;
  charactersInvolved: string;
  locationInvolved: string;
  mechanicalResult: string;
  visualImportance: number;
  spoilerSafe: boolean;
  dmApproved: boolean;
}

const emptyDraft: Draft = {
  speaker: "",
  eventType: "DM narration",
  rawText: "",
  structuredSummary: "",
  charactersInvolved: "",
  locationInvolved: "",
  mechanicalResult: "",
  visualImportance: 3,
  spoilerSafe: true,
  dmApproved: false,
};

export default function EventsView({ campaignId, core, status }: SharedProps) {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft });
  const [structuring, setStructuring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    setEvents(await api.get<EventDTO[]>(`/api/campaigns/${campaignId}/events`));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function structure() {
    if (!draft.rawText.trim()) return;
    setStructuring(true);
    setNote(null);
    try {
      const res = await api.post<StructuredEventResult>(
        `/api/campaigns/${campaignId}/events/structure`,
        { rawText: draft.rawText }
      );
      setDraft((d) => ({
        ...d,
        eventType: res.eventType || d.eventType,
        structuredSummary: res.structuredSummary,
        charactersInvolved: res.charactersInvolved.join(", "),
        locationInvolved: res.locationInvolved,
        mechanicalResult: res.mechanicalResult
          ? JSON.stringify(res.mechanicalResult)
          : "",
        visualImportance: res.visualImportance,
        spoilerSafe: res.possibleSpoilers.length === 0,
      }));
      setNote(
        `Structured via ${res.source}.` +
          (res.possibleSpoilers.length
            ? ` Possible spoilers: ${res.possibleSpoilers.join("; ")}`
            : "") +
          (res.suggestedSceneUpdate
            ? ` Suggested scene update: ${res.suggestedSceneUpdate}`
            : "")
      );
    } finally {
      setStructuring(false);
    }
  }

  async function save() {
    if (!draft.rawText.trim() && !draft.structuredSummary.trim()) return;
    setSaving(true);
    try {
      await api.post(`/api/campaigns/${campaignId}/events`, {
        ...draft,
        sceneId: core.activeScene?.id,
        mechanicalResult: draft.mechanicalResult || undefined,
      });
      setDraft({ ...emptyDraft });
      setNote(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, data: Partial<EventDTO>) {
    await api.patch(`/api/events/${id}`, data);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    await api.del(`/api/events/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-stone-100">Event Log</h2>

      {/* Add event */}
      <div className="card space-y-4">
        <h3 className="font-medium text-ember-400">Add event</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Speaker / source">
            <TextInput
              value={draft.speaker}
              onChange={(e) => setDraft({ ...draft, speaker: e.target.value })}
              placeholder="DM, Max, Mira…"
            />
          </Field>
          <Field label="Event type">
            <Select
              options={EVENT_TYPES}
              value={draft.eventType}
              onChange={(e) => setDraft({ ...draft, eventType: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Raw text">
          <TextArea
            value={draft.rawText}
            onChange={(e) => setDraft({ ...draft, rawText: e.target.value })}
            placeholder="Thorne charges the skeletal knight and hits with a 17, dealing 11 radiant damage."
          />
        </Field>
        <div className="flex items-center gap-3">
          <button
            className="btn-secondary"
            onClick={structure}
            disabled={structuring || !draft.rawText.trim()}
          >
            {structuring ? "Structuring…" : "Structure Event"}
          </button>
          <span className="text-xs text-stone-500">
            {status.aiEnabled ? "Uses AI when possible" : "Deterministic structuring"}
          </span>
        </div>

        {note && (
          <p className="rounded-md border border-arcane-500/30 bg-arcane-500/10 p-2 text-xs text-arcane-400">
            {note}
          </p>
        )}

        <Field label="Structured summary" hint="Reviewed/edited before saving.">
          <TextArea
            value={draft.structuredSummary}
            onChange={(e) =>
              setDraft({ ...draft, structuredSummary: e.target.value })
            }
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Characters involved (comma separated)">
            <TextInput
              value={draft.charactersInvolved}
              onChange={(e) =>
                setDraft({ ...draft, charactersInvolved: e.target.value })
              }
            />
          </Field>
          <Field label="Location involved">
            <TextInput
              value={draft.locationInvolved}
              onChange={(e) =>
                setDraft({ ...draft, locationInvolved: e.target.value })
              }
            />
          </Field>
          <Field label="Mechanical result (JSON, optional)">
            <TextInput
              value={draft.mechanicalResult}
              onChange={(e) =>
                setDraft({ ...draft, mechanicalResult: e.target.value })
              }
              placeholder='{"roll":17,"damage":11,"damageType":"radiant"}'
            />
          </Field>
          <Field label={`Visual importance: ${draft.visualImportance}`}>
            <input
              type="range"
              min={1}
              max={5}
              value={draft.visualImportance}
              onChange={(e) =>
                setDraft({ ...draft, visualImportance: Number(e.target.value) })
              }
              className="w-full accent-ember-500"
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            label="Spoiler-safe (can appear in prompts)"
            checked={draft.spoilerSafe}
            onChange={(v) => setDraft({ ...draft, spoilerSafe: v })}
          />
          <Checkbox
            label="DM-approved"
            checked={draft.dmApproved}
            onChange={(v) => setDraft({ ...draft, dmApproved: v })}
          />
          <button className="btn-primary ml-auto" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save event"}
          </button>
        </div>
      </div>

      {/* Event list */}
      <div className="space-y-3">
        <h3 className="font-medium text-stone-300">Recent events ({events.length})</h3>
        {events.map((e) => {
          const mech = parseObject(e.mechanicalResult);
          return (
            <div key={e.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pill">{e.eventType}</span>
                    {e.speaker && (
                      <span className="text-xs text-stone-500">{e.speaker}</span>
                    )}
                    <span className="text-xs text-stone-500">
                      ★{e.visualImportance}
                    </span>
                    {!e.spoilerSafe && (
                      <span className="pill border-amber-700/50 bg-amber-950/40 text-amber-300">
                        not spoiler-safe
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-stone-200">
                    {e.structuredSummary || e.rawText}
                  </p>
                  {e.structuredSummary && e.rawText && (
                    <p className="mt-1 text-xs text-stone-500">raw: {e.rawText}</p>
                  )}
                  {(parseList(e.charactersInvolved).length > 0 || mech) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
                      {parseList(e.charactersInvolved).map((n) => (
                        <span key={n} className="pill">
                          {n}
                        </span>
                      ))}
                      {mech && (
                        <span className="pill">{JSON.stringify(mech)}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    className={e.dmApproved ? "btn-primary text-xs" : "btn-secondary text-xs"}
                    onClick={() => patch(e.id, { dmApproved: !e.dmApproved })}
                  >
                    {e.dmApproved ? "Approved ✓" : "Approve"}
                  </button>
                  <button className="btn-ghost text-xs" onClick={() => remove(e.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
