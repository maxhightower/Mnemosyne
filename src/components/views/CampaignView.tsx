"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { SharedProps } from "@/components/Workspace";
import { Field, TextInput, TextArea } from "@/components/forms";

export default function CampaignView({ core, campaignId, reloadCore }: SharedProps) {
  const c = core.campaign;
  const [form, setForm] = useState({
    name: c.name,
    genre: c.genre,
    tone: c.tone,
    visualStyle: c.visualStyle,
    contentRating: c.contentRating,
    styleReferences: c.styleReferences,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch(`/api/campaigns/${campaignId}`, form);
      await reloadCore();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-stone-100">Campaign Settings</h2>
      <div className="card space-y-4">
        <Field label="Name">
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Genre / setting">
            <TextInput
              value={form.genre}
              onChange={(e) => setForm({ ...form, genre: e.target.value })}
            />
          </Field>
          <Field label="Tone">
            <TextInput
              value={form.tone}
              onChange={(e) => setForm({ ...form, tone: e.target.value })}
            />
          </Field>
        </div>
        <Field
          label="Default visual style"
          hint="Drives every generated prompt. Be specific: medium, palette, what to avoid."
        >
          <TextArea
            value={form.visualStyle}
            onChange={(e) => setForm({ ...form, visualStyle: e.target.value })}
          />
        </Field>
        <Field label="Content rating / safety notes">
          <TextInput
            value={form.contentRating}
            onChange={(e) => setForm({ ...form, contentRating: e.target.value })}
          />
        </Field>
        <Field label="Style references (free text)">
          <TextArea
            value={form.styleReferences}
            onChange={(e) => setForm({ ...form, styleReferences: e.target.value })}
            placeholder="Artists, films, or references that capture the look you want."
          />
        </Field>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-emerald-400">Saved ✓</span>}
        </div>
        <p className="text-xs text-stone-500">
          Created {new Date(c.createdAt).toLocaleString()} · Updated{" "}
          {new Date(c.updatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
