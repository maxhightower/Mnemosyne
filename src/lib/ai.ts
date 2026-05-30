import type { PromptGenInput, PromptGenOutput } from "./types";
import { generatePrompt } from "./promptGenerator";

// ---------------------------------------------------------------------------
// Optional AI integration (OpenAI-compatible Chat Completions API).
//
// Everything here is best-effort: if no API key is configured, or the request
// fails, callers fall back to the deterministic generator. The AI is held to
// the SAME spoiler rules as the deterministic path via the system prompt, and
// we additionally never send private notes / secrets to the model unless the
// scene reveals them.
// ---------------------------------------------------------------------------

export function aiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
}

const BASE_URL = () =>
  (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = () => process.env.OPENAI_MODEL || "gpt-4o-mini";

async function chatJSON(system: string, user: string): Promise<any> {
  const res = await fetch(`${BASE_URL()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL(),
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty content");
  return JSON.parse(content);
}

// ----- Event structuring ---------------------------------------------------

export interface StructuredEvent {
  eventType: string;
  structuredSummary: string;
  charactersInvolved: string[];
  locationInvolved: string;
  mechanicalResult: Record<string, unknown> | null;
  visualImportance: number;
  possibleSpoilers: string[];
  suggestedSceneUpdate: string;
}

const STRUCTURE_SYSTEM = `You are a D&D session note structurer for a visual storytelling tool.
Given a raw session note, extract structured data. Respond ONLY with a JSON object of the shape:
{
  "eventType": "DM narration | player action | dice roll | attack | spell cast | dialogue | discovery | travel | scene change | combat state change | character condition update | DM correction",
  "structuredSummary": "one concise, vivid, visual sentence describing what visibly happens",
  "charactersInvolved": ["names"],
  "locationInvolved": "location name or empty string",
  "mechanicalResult": { } ,
  "visualImportance": 1,
  "possibleSpoilers": ["anything that might reveal hidden info"],
  "suggestedSceneUpdate": "short note on how the current scene should change, or empty string"
}
visualImportance is an integer 1-5 (5 = climactic). mechanicalResult is an object (roll, result, damage, damageType...) or {} if none.`;

export async function structureEvent(
  rawText: string,
  hints: { knownCharacters?: string[]; knownLocations?: string[] } = {}
): Promise<StructuredEvent> {
  const user = JSON.stringify({
    rawText,
    knownCharacters: hints.knownCharacters ?? [],
    knownLocations: hints.knownLocations ?? [],
  });
  const data = await chatJSON(STRUCTURE_SYSTEM, user);
  return {
    eventType: String(data.eventType ?? "DM narration"),
    structuredSummary: String(data.structuredSummary ?? rawText),
    charactersInvolved: Array.isArray(data.charactersInvolved)
      ? data.charactersInvolved.map(String)
      : [],
    locationInvolved: String(data.locationInvolved ?? ""),
    mechanicalResult:
      data.mechanicalResult && typeof data.mechanicalResult === "object"
        ? data.mechanicalResult
        : null,
    visualImportance: clampInt(data.visualImportance, 1, 5, 3),
    possibleSpoilers: Array.isArray(data.possibleSpoilers)
      ? data.possibleSpoilers.map(String)
      : [],
    suggestedSceneUpdate: String(data.suggestedSceneUpdate ?? ""),
  };
}

// ----- Prompt generation ----------------------------------------------------

const PROMPT_SYSTEM = `You are the visual director for a tabletop RPG illustration tool.
You receive the current campaign state and must produce image-generation prompts.
CRITICAL RULES:
- Never include private DM notes, secrets, hidden monsters, or unrevealed traits in the visual prompt. The provided state has already been filtered, but do not infer or invent hidden facts.
- Ground everything in the provided state. Do not invent major facts.
- Honor all corrections; they override other descriptions.
Respond ONLY with a JSON object:
{
  "shortPrompt": "concise image prompt (1-3 sentences)",
  "expandedPrompt": "detailed cinematic prompt with a 'Continuity:' line and a 'Do not show:' line",
  "negativePrompt": "comma-separated exclusions",
  "continuityNotes": ["canonical details to preserve"],
  "spoilerWarnings": ["any withheld info the DM should know about"]
}`;

export async function generatePromptAI(
  input: PromptGenInput
): Promise<PromptGenOutput> {
  const reveal = input.scene?.revealHidden ?? false;
  // Build a spoiler-filtered view of the state to send to the model.
  const safeState = {
    campaign: {
      name: input.campaign.name,
      genre: input.campaign.genre,
      tone: input.campaign.tone,
      visualStyle: input.campaign.visualStyle,
      contentRating: input.campaign.contentRating,
      styleReferences: input.campaign.styleReferences,
    },
    location: input.location && {
      name: input.location.name,
      type: input.location.type,
      publicDescription: input.location.publicDescription || input.location.description,
      mood: input.location.mood,
      lighting: input.location.lighting,
      weather: input.location.weather,
      landmarks: input.location.landmarks,
      ...(reveal
        ? { hiddenFeatures: input.location.hiddenFeatures }
        : {}),
    },
    scene: input.scene && {
      title: input.scene.title,
      importantObjects: input.scene.importantObjects,
      mood: input.scene.mood,
      lighting: input.scene.lighting,
      cameraPreference: input.scene.cameraPreference,
      visibleAction: input.scene.visibleAction,
      ...(reveal ? { hiddenInformation: input.scene.hiddenInformation } : {}),
    },
    characters: input.characters
      .filter((c) => c.active)
      .map((c) => ({
        name: c.name,
        type: c.type,
        species: c.species,
        classRole: c.classRole,
        publicDescription: c.publicDescription,
        physicalAppearance: c.physicalAppearance,
        clothingArmor: c.clothingArmor,
        signatureItems: c.signatureItems,
        currentCondition: c.currentCondition,
        ...(reveal ? { secrets: c.secrets } : {}),
      })),
    recentApprovedEvents: input.events
      .filter((e) => e.dmApproved && (reveal || e.spoilerSafe))
      .sort((a, b) => b.visualImportance - a.visualImportance)
      .slice(0, 5)
      .map((e) => ({
        summary: e.structuredSummary || e.rawText,
        charactersInvolved: e.charactersInvolved,
        visualImportance: e.visualImportance,
      })),
    corrections: input.corrections
      .filter((c) => c.active)
      .map((c) => ({
        type: c.correctionType,
        target: c.target,
        correction: c.correction,
        priority: c.priority,
      })),
    hiddenInformationRevealed: reveal,
  };

  const data = await chatJSON(PROMPT_SYSTEM, JSON.stringify(safeState));
  return {
    shortPrompt: String(data.shortPrompt ?? ""),
    expandedPrompt: String(data.expandedPrompt ?? ""),
    negativePrompt: String(data.negativePrompt ?? ""),
    continuityNotes: Array.isArray(data.continuityNotes)
      ? data.continuityNotes.map(String)
      : [],
    spoilerWarnings: Array.isArray(data.spoilerWarnings)
      ? data.spoilerWarnings.map(String)
      : [],
    source: "ai",
  };
}

/** Generate with AI when available, otherwise deterministic. Never throws. */
export async function generatePromptSmart(
  input: PromptGenInput,
  preferAI: boolean
): Promise<PromptGenOutput> {
  if (preferAI && aiEnabled()) {
    try {
      return await generatePromptAI(input);
    } catch (err) {
      console.warn("AI prompt generation failed, falling back:", err);
    }
  }
  return generatePrompt(input);
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
