"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { SharedProps } from "@/components/Workspace";
import type { CharacterDTO } from "@/lib/dto";
import { CHARACTER_TYPES } from "@/lib/dto";
import { parseList } from "@/lib/json";
import { Field, TextInput, TextArea, Select, Checkbox, SpoilerBadge } from "@/components/forms";
import ImageRefs from "@/components/ImageRefs";

// In the editor, list fields are held in friendlier shapes than the DTO's JSON
// strings: signatureItems as a comma string, canonicalImageRefs as an array.
type Draft = Omit<Partial<CharacterDTO>, "signatureItems" | "canonicalImageRefs"> & {
  name: string;
  signatureItems?: string;
  canonicalImageRefs?: string[];
};

const empty: Draft = {
  name: "",
  type: "player character",
  species: "",
  classRole: "",
  publicDescription: "",
  physicalAppearance: "",
  clothingArmor: "",
  signatureItems: "",
  personalityVisualCues: "",
  currentCondition: "",
  secrets: "",
  privateNotes: "",
  canonicalImageRefs: [],
  active: true,
};

export default function CharactersView({ core, campaignId, reloadCore }: SharedProps) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(c: CharacterDTO) {
    setEditing({
      ...c,
      signatureItems: parseList(c.signatureItems).join(", "),
      canonicalImageRefs: parseList(c.canonicalImageRefs),
    });
  }

  async function save() {
    if (!editing || !editing.name.trim()) return;
    setBusy(true);
    try {
      if (editing.id) {
        await api.patch(`/api/characters/${editing.id}`, editing);
      } else {
        await api.post(`/api/campaigns/${campaignId}/characters`, editing);
      }
      setEditing(null);
      await reloadCore();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this character?")) return;
    await api.del(`/api/characters/${id}`);
    await reloadCore();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-stone-100">Characters</h2>
        <button className="btn-primary" onClick={() => setEditing({ ...empty })}>
          + Add character
        </button>
      </div>

      {editing && (
        <div className="card space-y-4">
          <h3 className="font-medium text-ember-400">
            {editing.id ? "Edit character" : "New character"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name">
              <TextInput
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <Select
                options={CHARACTER_TYPES}
                value={editing.type}
                onChange={(e) => setEditing({ ...editing, type: e.target.value })}
              />
            </Field>
            <Field label="Race / species">
              <TextInput
                value={editing.species ?? ""}
                onChange={(e) => setEditing({ ...editing, species: e.target.value })}
              />
            </Field>
            <Field label="Class / role">
              <TextInput
                value={editing.classRole ?? ""}
                onChange={(e) => setEditing({ ...editing, classRole: e.target.value })}
              />
            </Field>
          </div>
          <Field
            label="Public visual description"
            hint="This is what the prompt generator uses. Keep it spoiler-free."
          >
            <TextArea
              value={editing.publicDescription ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, publicDescription: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Physical appearance">
              <TextInput
                value={editing.physicalAppearance ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, physicalAppearance: e.target.value })
                }
              />
            </Field>
            <Field label="Clothing / armor">
              <TextInput
                value={editing.clothingArmor ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, clothingArmor: e.target.value })
                }
              />
            </Field>
            <Field label="Signature items (comma separated)">
              <TextInput
                value={editing.signatureItems ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, signatureItems: e.target.value })
                }
              />
            </Field>
            <Field label="Current condition">
              <TextInput
                value={editing.currentCondition ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, currentCondition: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Personality visual cues">
            <TextInput
              value={editing.personalityVisualCues ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, personalityVisualCues: e.target.value })
              }
            />
          </Field>

          <Field
            label="Reference art (canonical visual source)"
            hint="Upload art or paste image URLs. When present, prompts add a note that the character must match this reference."
          >
            <ImageRefs
              value={editing.canonicalImageRefs ?? []}
              onChange={(next) =>
                setEditing({ ...editing, canonicalImageRefs: next })
              }
            />
          </Field>

          <div className="rounded-md border border-amber-900/40 bg-amber-950/10 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <SpoilerBadge />
              <span className="text-xs text-stone-400">
                Never included in prompts unless a scene reveals hidden info.
              </span>
            </div>
            <Field label="Secrets / hidden traits">
              <TextArea
                value={editing.secrets ?? ""}
                onChange={(e) => setEditing({ ...editing, secrets: e.target.value })}
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

          <Checkbox
            label="Active (appears in scenes & prompts)"
            checked={editing.active ?? true}
            onChange={(v) => setEditing({ ...editing, active: v })}
          />

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
        {core.characters.length === 0 && (
          <p className="text-stone-500">No characters yet.</p>
        )}
        {core.characters.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {parseList(c.canonicalImageRefs)[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={parseList(c.canonicalImageRefs)[0]}
                    alt={`${c.name} reference`}
                    className="h-16 w-16 flex-shrink-0 rounded-md border border-ink-700 object-cover"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-stone-100">{c.name}</span>
                    <span className="pill">{c.type}</span>
                    {!c.active && <span className="pill text-stone-500">inactive</span>}
                    {parseList(c.canonicalImageRefs).length > 0 && (
                      <span className="pill border-arcane-500/40 text-arcane-400">
                        {parseList(c.canonicalImageRefs).length} ref
                      </span>
                    )}
                    {(c.secrets || c.privateNotes) && <SpoilerBadge />}
                  </div>
                  <p className="mt-1 text-sm text-stone-400">
                    {c.publicDescription || "No public description."}
                  </p>
                  {c.currentCondition && (
                    <p className="mt-1 text-xs text-amber-300">
                      Condition: {c.currentCondition}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => startEdit(c)}>
                  Edit
                </button>
                <button className="btn-ghost" onClick={() => remove(c.id)}>
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
