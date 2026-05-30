"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { SharedProps } from "@/components/Workspace";
import type { CorrectionDTO } from "@/lib/dto";
import { Field, TextInput, TextArea, Select, Checkbox } from "@/components/forms";

const TYPES = ["character", "location", "scene", "style", "general"];
const PRIORITIES = ["high", "medium", "low"];

export default function CorrectionsView({ campaignId }: SharedProps) {
  const [items, setItems] = useState<CorrectionDTO[]>([]);
  const [form, setForm] = useState({
    correctionType: "character",
    target: "",
    correction: "",
    priority: "high",
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    setItems(await api.get<CorrectionDTO[]>(`/api/campaigns/${campaignId}/corrections`));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function add() {
    if (!form.correction.trim()) return;
    setBusy(true);
    try {
      await api.post(`/api/campaigns/${campaignId}/corrections`, form);
      setForm({ ...form, target: "", correction: "" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: CorrectionDTO) {
    await api.patch(`/api/corrections/${c.id}`, { active: !c.active });
    await load();
  }

  async function remove(id: string) {
    await api.del(`/api/corrections/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-stone-100">DM Corrections</h2>
      <p className="text-sm text-stone-400">
        Corrections are persistent memory. Active corrections are folded into every
        future prompt — and “never / not X” phrases become negative-prompt exclusions.
      </p>

      <div className="card space-y-4">
        <h3 className="font-medium text-ember-400">Add correction</h3>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Type">
            <Select
              options={TYPES}
              value={form.correctionType}
              onChange={(e) => setForm({ ...form, correctionType: e.target.value })}
            />
          </Field>
          <Field label="Target">
            <TextInput
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              placeholder="Thorne, The Flooded Crypt…"
            />
          </Field>
          <Field label="Priority">
            <Select
              options={PRIORITIES}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Correction">
          <TextArea
            value={form.correction}
            onChange={(e) => setForm({ ...form, correction: e.target.value })}
            placeholder="Thorne's armor is dented silver plate, never black armor."
          />
        </Field>
        <button className="btn-primary" onClick={add} disabled={busy}>
          {busy ? "Saving…" : "Add correction"}
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-stone-300">Corrections ({items.length})</h3>
        {items.map((c) => (
          <div key={c.id} className="card flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="pill">{c.correctionType}</span>
                {c.target && (
                  <span className="text-sm font-medium text-stone-200">{c.target}</span>
                )}
                <span
                  className={`pill ${
                    c.priority === "high"
                      ? "border-red-800/50 bg-red-950/40 text-red-300"
                      : ""
                  }`}
                >
                  {c.priority}
                </span>
                {!c.active && <span className="pill text-stone-500">inactive</span>}
              </div>
              <p className="mt-1 text-sm text-stone-300">{c.correction}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Checkbox label="active" checked={c.active} onChange={() => toggle(c)} />
              <button className="btn-ghost text-xs" onClick={() => remove(c.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
