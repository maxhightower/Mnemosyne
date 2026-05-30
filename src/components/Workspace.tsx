"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type {
  CampaignDTO,
  CharacterDTO,
  LocationDTO,
  SceneDTO,
} from "@/lib/dto";
import CampaignView from "@/components/views/CampaignView";
import CharactersView from "@/components/views/CharactersView";
import LocationsView from "@/components/views/LocationsView";
import SceneView from "@/components/views/SceneView";
import EventsView from "@/components/views/EventsView";
import PromptsView from "@/components/views/PromptsView";
import CorrectionsView from "@/components/views/CorrectionsView";
import ReferencesView from "@/components/views/ReferencesView";

export type ViewKey =
  | "scene"
  | "characters"
  | "locations"
  | "events"
  | "prompts"
  | "references"
  | "corrections"
  | "campaign";

export interface CoreData {
  campaign: CampaignDTO;
  characters: CharacterDTO[];
  locations: LocationDTO[];
  scenes: SceneDTO[];
  activeScene: SceneDTO | null;
}

export interface SharedProps {
  campaignId: string;
  core: CoreData;
  reloadCore: () => Promise<void>;
  status: { aiEnabled: boolean; imageGenEnabled: boolean };
  goTo: (v: ViewKey) => void;
}

const NAV: { key: ViewKey; label: string }[] = [
  { key: "scene", label: "Current Scene" },
  { key: "characters", label: "Characters" },
  { key: "locations", label: "Locations" },
  { key: "events", label: "Event Log" },
  { key: "prompts", label: "Visual Prompts" },
  { key: "references", label: "Canonical References" },
  { key: "corrections", label: "Corrections" },
  { key: "campaign", label: "Campaign Settings" },
];

export default function Workspace({ campaignId }: { campaignId: string }) {
  const [view, setView] = useState<ViewKey>("scene");
  const [core, setCore] = useState<CoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState({ aiEnabled: false, imageGenEnabled: false });

  const reloadCore = useCallback(async () => {
    try {
      const [campaign, characters, locations, scenes] = await Promise.all([
        api.get<CampaignDTO>(`/api/campaigns/${campaignId}`),
        api.get<CharacterDTO[]>(`/api/campaigns/${campaignId}/characters`),
        api.get<LocationDTO[]>(`/api/campaigns/${campaignId}/locations`),
        api.get<SceneDTO[]>(`/api/campaigns/${campaignId}/scenes`),
      ]);
      const activeScene = scenes.find((s) => s.isActive) ?? scenes[0] ?? null;
      setCore({ campaign, characters, locations, scenes, activeScene });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [campaignId]);

  useEffect(() => {
    reloadCore();
    api
      .get<{ aiEnabled: boolean; imageGenEnabled: boolean }>("/api/status")
      .then(setStatus)
      .catch(() => {});
  }, [reloadCore]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-red-300">{error}</p>
        <Link href="/" className="btn-secondary mt-4">
          ← Back to campaigns
        </Link>
      </main>
    );
  }

  if (!core) {
    return <main className="px-6 py-10 text-stone-500">Loading campaign…</main>;
  }

  const shared: SharedProps = {
    campaignId,
    core,
    reloadCore,
    status,
    goTo: setView,
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-ink-700 bg-ink-900">
        <div className="border-b border-ink-700 p-4">
          <Link href="/" className="text-xs text-stone-500 hover:text-stone-300">
            ← All campaigns
          </Link>
          <h1 className="mt-1 truncate text-lg font-semibold text-ember-400">
            {core.campaign.name}
          </h1>
          <p className="truncate text-xs text-stone-500">
            {core.campaign.genre || "no genre set"}
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={`nav-item ${view === n.key ? "nav-item-active" : ""}`}
            >
              <span>{n.label}</span>
              {n.key === "scene" && core.activeScene && (
                <span className="h-2 w-2 rounded-full bg-emerald-400" title="active scene set" />
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-ink-700 p-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                status.aiEnabled ? "bg-emerald-400" : "bg-stone-600"
              }`}
            />
            AI {status.aiEnabled ? "enabled" : "off (deterministic)"}
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 overflow-y-auto bg-ink-950 p-8">
        <div className="mx-auto max-w-4xl">
          {view === "scene" && <SceneView {...shared} />}
          {view === "characters" && <CharactersView {...shared} />}
          {view === "locations" && <LocationsView {...shared} />}
          {view === "events" && <EventsView {...shared} />}
          {view === "prompts" && <PromptsView {...shared} />}
          {view === "references" && <ReferencesView {...shared} />}
          {view === "corrections" && <CorrectionsView {...shared} />}
          {view === "campaign" && <CampaignView {...shared} />}
        </div>
      </main>
    </div>
  );
}
