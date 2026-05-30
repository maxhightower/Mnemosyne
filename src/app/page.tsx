"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { CampaignDTO } from "@/lib/dto";
import { Field, TextInput, TextArea } from "@/components/forms";

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    genre: "",
    tone: "",
    visualStyle: "",
    contentRating: "",
  });

  async function load() {
    setLoading(true);
    try {
      setCampaigns(await api.get<CampaignDTO[]>("/api/campaigns"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError(null);
    try {
      const created = await api.post<CampaignDTO>("/api/campaigns", form);
      setForm({ name: "", genre: "", tone: "", visualStyle: "", contentRating: "" });
      setCreating(false);
      setCampaigns((prev) => [created, ...prev]);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this campaign and all its data? This cannot be undone.")) return;
    await api.del(`/api/campaigns/${id}`);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-ember-400">Project Mnemosyne</h1>
        <p className="mt-1 text-stone-400">
          A live campaign illustrator for tabletop RPGs. Pick a campaign or start a new
          one.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-stone-200">Campaigns</h2>
        <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cancel" : "+ New Campaign"}
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="card mb-6 space-y-3">
          <Field label="Name">
            <TextInput
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="The Stolen Sun"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Genre / setting">
              <TextInput
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                placeholder="dark medieval fantasy"
              />
            </Field>
            <Field label="Tone">
              <TextInput
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
                placeholder="mysterious, dangerous, mythic"
              />
            </Field>
          </div>
          <Field label="Default visual style">
            <TextArea
              value={form.visualStyle}
              onChange={(e) => setForm({ ...form, visualStyle: e.target.value })}
              placeholder="dark medieval oil painting, dramatic torchlight, painterly textures, not anime, not photorealistic"
            />
          </Field>
          <Field label="Content rating / safety notes">
            <TextInput
              value={form.contentRating}
              onChange={(e) => setForm({ ...form, contentRating: e.target.value })}
              placeholder="PG-13 fantasy violence"
            />
          </Field>
          <div className="flex justify-end">
            <button className="btn-primary" type="submit">
              Create Campaign
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-stone-500">No campaigns yet. Create one to begin.</p>
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li key={c.id} className="card flex items-center justify-between">
              <Link href={`/campaigns/${c.id}`} className="group flex-1">
                <div className="text-lg font-medium text-stone-100 group-hover:text-ember-400">
                  {c.name}
                </div>
                <div className="text-sm text-stone-400">
                  {[c.genre, c.tone].filter(Boolean).join(" • ") || "No tone set"}
                </div>
                {c._count && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="pill">{c._count.characters} characters</span>
                    <span className="pill">{c._count.locations} locations</span>
                    <span className="pill">{c._count.scenes} scenes</span>
                    <span className="pill">{c._count.events} events</span>
                  </div>
                )}
              </Link>
              <div className="ml-4 flex items-center gap-2">
                <Link href={`/campaigns/${c.id}`} className="btn-secondary">
                  Open
                </Link>
                <button className="btn-ghost" onClick={() => remove(c.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
