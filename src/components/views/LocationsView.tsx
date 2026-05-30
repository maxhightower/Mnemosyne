"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { SharedProps } from "@/components/Workspace";
import type { LocationDTO } from "@/lib/dto";
import { Field, TextInput, TextArea, SpoilerBadge } from "@/components/forms";

type Draft = Partial<LocationDTO> & { name: string };

const empty: Draft = {
  name: "",
  type: "",
  publicDescription: "",
  mood: "",
  landmarks: "",
  lighting: "",
  weather: "",
  hiddenFeatures: "",
  privateNotes: "",
};

export default function LocationsView({ core, campaignId, reloadCore }: SharedProps) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing || !editing.name.trim()) return;
    setBusy(true);
    try {
      if (editing.id) await api.patch(`/api/locations/${editing.id}`, editing);
      else await api.post(`/api/campaigns/${campaignId}/locations`, editing);
      setEditing(null);
      await reloadCore();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this location?")) return;
    await api.del(`/api/locations/${id}`);
    await reloadCore();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-stone-100">Locations</h2>
        <button className="btn-primary" onClick={() => setEditing({ ...empty })}>
          + Add location
        </button>
      </div>

      {editing && (
        <div className="card space-y-4">
          <h3 className="font-medium text-ember-400">
            {editing.id ? "Edit location" : "New location"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name">
              <TextInput
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <TextInput
                value={editing.type ?? ""}
                onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                placeholder="dungeon chamber, tavern, forest…"
              />
            </Field>
          </div>
          <Field
            label="Public visual description"
            hint="Used by the prompt generator. Spoiler-free."
          >
            <TextArea
              value={editing.publicDescription ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, publicDescription: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mood">
              <TextInput
                value={editing.mood ?? ""}
                onChange={(e) => setEditing({ ...editing, mood: e.target.value })}
              />
            </Field>
            <Field label="Lighting">
              <TextInput
                value={editing.lighting ?? ""}
                onChange={(e) => setEditing({ ...editing, lighting: e.target.value })}
              />
            </Field>
            <Field label="Weather / environment">
              <TextInput
                value={editing.weather ?? ""}
                onChange={(e) => setEditing({ ...editing, weather: e.target.value })}
              />
            </Field>
            <Field label="Important landmarks">
              <TextInput
                value={editing.landmarks ?? ""}
                onChange={(e) => setEditing({ ...editing, landmarks: e.target.value })}
              />
            </Field>
          </div>

          <div className="rounded-md border border-amber-900/40 bg-amber-950/10 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <SpoilerBadge />
              <span className="text-xs text-stone-400">
                Hidden until a scene reveals it.
              </span>
            </div>
            <Field label="Hidden features">
              <TextArea
                value={editing.hiddenFeatures ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, hiddenFeatures: e.target.value })
                }
              />
            </Field>
            <Field label="Private DM notes">
              <TextArea
                value={editing.privateNotes ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, privateNotes: e.target.value })
                }
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <button className="btn-primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {core.locations.length === 0 && (
          <p className="text-stone-500">No locations yet.</p>
        )}
        {core.locations.map((l) => (
          <div key={l.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium text-stone-100">{l.name}</span>
                  {l.type && <span className="pill">{l.type}</span>}
                  {(l.hiddenFeatures || l.privateNotes) && <SpoilerBadge />}
                </div>
                <p className="mt-1 text-sm text-stone-400">
                  {l.publicDescription || "No public description."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
                  {l.mood && <span className="pill">mood: {l.mood}</span>}
                  {l.lighting && <span className="pill">light: {l.lighting}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setEditing({ ...l })}>
                  Edit
                </button>
                <button className="btn-ghost" onClick={() => remove(l.id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
