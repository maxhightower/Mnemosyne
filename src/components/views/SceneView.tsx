"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import type { SharedProps } from "@/components/Workspace";
import type { EventDTO, SceneDTO } from "@/lib/dto";
import { parseList } from "@/lib/json";
import { Field, TextInput, TextArea, Select, Checkbox, SpoilerBadge } from "@/components/forms";
import GeneratePanel from "@/components/GeneratePanel";

export default function SceneView(props: SharedProps) {
  const { core, campaignId, reloadCore, status, goTo } = props;
  const scene = core.activeScene;

  const [events, setEvents] = useState<EventDTO[]>([]);
  useEffect(() => {
    api
      .get<EventDTO[]>(`/api/campaigns/${campaignId}/events`)
      .then(setEvents)
      .catch(() => {});
  }, [campaignId]);

  const recentApproved = useMemo(
    () =>
      events
        .filter((e) => e.dmApproved)
        .sort((a, b) => b.visualImportance - a.visualImportance)
        .slice(0, 6),
    [events]
  );

  if (!scene) {
    return <NoScene {...props} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-stone-100">Current Scene</h2>
        <span className="pill border-emerald-700/50 bg-emerald-950/40 text-emerald-300">
          active
        </span>
      </div>

      <SceneEditor key={scene.id} {...props} scene={scene} />

      {/* Recent approved events */}
      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium text-stone-300">Recent approved events</h3>
          <button className="btn-ghost text-xs" onClick={() => goTo("events")}>
            Manage events →
          </button>
        </div>
        {recentApproved.length === 0 ? (
          <p className="text-sm text-stone-500">
            No approved events yet. Add and approve events to enrich the prompt.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentApproved.map((e) => (
              <li key={e.id} className="flex items-start gap-2 text-sm">
                <span className="pill">{e.eventType}</span>
                <span className="text-stone-300">
                  {e.structuredSummary || e.rawText}
                </span>
                <span className="ml-auto text-xs text-stone-500">★{e.visualImportance}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Generation */}
      <div className="card">
        <h3 className="mb-3 font-medium text-ember-400">Generate</h3>
        <GeneratePanel
          campaignId={campaignId}
          sceneId={scene.id}
          aiAvailable={status.aiEnabled}
          onSaved={reloadCore}
        />
        <div className="mt-4 border-t border-ink-700 pt-3">
          <button className="btn-ghost text-sm" onClick={() => goTo("corrections")}>
            + Add a correction
          </button>
        </div>
      </div>
    </div>
  );
}

function NoScene({ core, campaignId, reloadCore }: SharedProps) {
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      await api.post(`/api/campaigns/${campaignId}/scenes`, {
        title: "Current Scene",
        locationId: core.locations[0]?.id ?? null,
        presentCharacterIds: core.characters.filter((c) => c.active).map((c) => c.id),
        isActive: true,
      });
      await reloadCore();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-100">Current Scene</h2>
      <div className="card">
        <p className="text-stone-400">
          No active scene yet. Create one to start composing prompts.
        </p>
        <button className="btn-primary mt-4" onClick={create} disabled={busy}>
          {busy ? "Creating…" : "Create current scene"}
        </button>
      </div>
    </div>
  );
}

function SceneEditor({
  core,
  scene,
  reloadCore,
}: SharedProps & { scene: SceneDTO }) {
  const [form, setForm] = useState({
    title: scene.title,
    locationId: scene.locationId ?? "",
    presentCharacterIds: parseList(scene.presentCharacterIds),
    importantObjects: scene.importantObjects,
    mood: scene.mood,
    lighting: scene.lighting,
    cameraPreference: scene.cameraPreference,
    visibleAction: scene.visibleAction,
    hiddenInformation: scene.hiddenInformation,
    revealHidden: scene.revealHidden,
    notes: scene.notes,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleChar(id: string) {
    setForm((f) => ({
      ...f,
      presentCharacterIds: f.presentCharacterIds.includes(id)
        ? f.presentCharacterIds.filter((x) => x !== id)
        : [...f.presentCharacterIds, id],
    }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch(`/api/scenes/${scene.id}`, form);
      await reloadCore();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-4">
      <Field label="Scene title">
        <TextInput
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </Field>

      <Field label="Active location">
        <Select
          options={["", ...core.locations.map((l) => l.name)]}
          value={core.locations.find((l) => l.id === form.locationId)?.name ?? ""}
          onChange={(e) => {
            const loc = core.locations.find((l) => l.name === e.target.value);
            setForm({ ...form, locationId: loc?.id ?? "" });
          }}
        />
      </Field>

      <Field label="Present characters">
        <div className="flex flex-wrap gap-3">
          {core.characters.length === 0 && (
            <span className="text-sm text-stone-500">No characters defined.</span>
          )}
          {core.characters.map((c) => (
            <Checkbox
              key={c.id}
              label={c.name}
              checked={form.presentCharacterIds.includes(c.id)}
              onChange={() => toggleChar(c.id)}
            />
          ))}
        </div>
      </Field>

      <Field label="Visible action" hint="The main thing happening right now.">
        <TextArea
          value={form.visibleAction}
          onChange={(e) => setForm({ ...form, visibleAction: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Important objects">
          <TextInput
            value={form.importantObjects}
            onChange={(e) => setForm({ ...form, importantObjects: e.target.value })}
          />
        </Field>
        <Field label="Camera preference">
          <TextInput
            value={form.cameraPreference}
            onChange={(e) => setForm({ ...form, cameraPreference: e.target.value })}
            placeholder="cinematic wide shot, close-up…"
          />
        </Field>
        <Field label="Current mood">
          <TextInput
            value={form.mood}
            onChange={(e) => setForm({ ...form, mood: e.target.value })}
          />
        </Field>
        <Field label="Current lighting">
          <TextInput
            value={form.lighting}
            onChange={(e) => setForm({ ...form, lighting: e.target.value })}
          />
        </Field>
      </div>

      <div className="rounded-md border border-amber-900/40 bg-amber-950/10 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <SpoilerBadge />
          <span className="text-xs text-stone-400">
            Hidden info is excluded from prompts unless you toggle reveal.
          </span>
        </div>
        <Field label="Hidden information">
          <TextArea
            value={form.hiddenInformation}
            onChange={(e) => setForm({ ...form, hiddenInformation: e.target.value })}
          />
        </Field>
        <Checkbox
          label="Reveal hidden info in generated prompts (use with care)"
          checked={form.revealHidden}
          onChange={(v) => setForm({ ...form, revealHidden: v })}
        />
      </div>

      <Field label="Scene notes">
        <TextArea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save scene"}
        </button>
        {saved && <span className="text-sm text-emerald-400">Saved ✓</span>}
      </div>
    </div>
  );
}
