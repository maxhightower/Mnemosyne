import type {
  PromptGenInput,
  PromptGenOutput,
  CharacterState,
  EventState,
} from "./types";

// ---------------------------------------------------------------------------
// Deterministic prompt generator.
//
// This is the canonical, always-available prompt builder. It compiles the
// current campaign state into short + expanded image prompts WITHOUT calling an
// LLM, so the app stays testable and demoable offline. The AI service in
// src/lib/ai.ts produces the same PromptGenOutput shape and is used only when an
// API key is configured.
//
// Spoiler protection is enforced here: private DM notes, character secrets,
// location hidden features, and scene hidden information are NEVER included in
// the prompt unless scene.revealHidden is explicitly true.
// ---------------------------------------------------------------------------

const DEFAULT_NEGATIVES = [
  "modern objects",
  "anime style",
  "cartoon proportions",
  "photorealism",
  "text",
  "watermark",
  "extra limbs",
  "deformed hands",
];

function cleanup(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/ +([.,;])/g, "$1")
    .replace(/\.{2,}/g, ".") // collapse accidental double periods
    .replace(/\. *\./g, ".")
    .replace(/ +\n/g, "\n")
    .trim();
}

/** Remove a single trailing sentence terminator so phrases join cleanly. */
function stripPeriod(s: string): string {
  return s.trim().replace(/[.!?]+$/, "").trim();
}

/** Lowercase the first character (for embedding a phrase mid-sentence). */
function lc(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function joinSentences(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (/[.!?]$/.test(p) ? p : `${p}.`))
    .join(" ");
}

/** Join phrases into one flowing sentence list separated by ". ". */
function joinPhrases(parts: string[]): string {
  return parts.map(stripPeriod).filter(Boolean).join(". ");
}

/** A short visual phrase for a character, using only public information. */
function characterPhrase(c: CharacterState): string {
  if (c.publicDescription.trim()) {
    let phrase = stripPeriod(c.publicDescription);
    if (c.currentCondition.trim()) {
      phrase = `${phrase}, ${c.currentCondition.trim()}`;
    }
    return phrase;
  }
  // Build from structured public fields when no description is provided.
  const bits = [
    c.name,
    [c.species, c.classRole].filter(Boolean).join(" "),
    c.physicalAppearance,
    c.clothingArmor,
    c.signatureItems.length ? `carrying ${c.signatureItems.join(", ")}` : "",
    c.currentCondition ? `currently ${c.currentCondition}` : "",
  ].filter(Boolean);
  return bits.join(", ");
}

/** Pick the most visually important, DM-approved, spoiler-safe events. */
function selectKeyEvents(events: EventState[], limit: number): EventState[] {
  return [...events]
    .filter((e) => e.dmApproved && e.spoilerSafe)
    .sort((a, b) => b.visualImportance - a.visualImportance)
    .slice(0, limit);
}

function eventPhrase(e: EventState): string {
  const base = e.structuredSummary.trim() || e.rawText.trim();
  return base;
}

export function generatePrompt(input: PromptGenInput): PromptGenOutput {
  const { campaign, scene, location, characters, events, corrections } = input;

  const spoilerWarnings: string[] = [];
  const continuityNotes: string[] = [];

  const reveal = scene?.revealHidden ?? false;

  // ----- Style -----------------------------------------------------------
  const styleBits = [campaign.visualStyle, campaign.tone]
    .map((s) => s.trim())
    .filter(Boolean);
  const style = styleBits.join(", ");

  // ----- Location --------------------------------------------------------
  const locationDesc =
    location?.publicDescription?.trim() || location?.description?.trim() || "";
  const locationName = location?.name?.trim() || "";

  if (location?.hiddenFeatures?.trim() && !reveal) {
    spoilerWarnings.push(
      `Location "${location.name}" has hidden features that are withheld from the prompt.`
    );
  }
  if (location?.privateNotes?.trim() && !reveal) {
    spoilerWarnings.push(
      `Location "${location.name}" has private DM notes (not rendered).`
    );
  }

  // ----- Characters ------------------------------------------------------
  const activeChars = characters.filter((c) => c.active);
  for (const c of activeChars) {
    if (c.secrets?.trim() && !reveal) {
      spoilerWarnings.push(
        `Character "${c.name}" has hidden traits that are withheld from the prompt.`
      );
    }
    if (c.privateNotes?.trim() && !reveal) {
      spoilerWarnings.push(
        `Character "${c.name}" has private DM notes (not rendered).`
      );
    }
  }
  const charPhrases = activeChars.map(characterPhrase).filter(Boolean);

  // ----- Action ----------------------------------------------------------
  const keyEvents = selectKeyEvents(events, 4);
  const sceneAction = scene?.visibleAction?.trim() || "";
  const eventPhrases = keyEvents.map(eventPhrase).filter(Boolean);

  // Surface any approved-but-spoilery events as warnings.
  for (const e of events) {
    if (e.dmApproved && !e.spoilerSafe && !reveal) {
      spoilerWarnings.push(
        `Event "${(e.structuredSummary || e.rawText).slice(0, 60)}..." is flagged as not spoiler-safe and is excluded.`
      );
    }
  }

  // ----- Camera / mood / lighting ---------------------------------------
  const camera = scene?.cameraPreference?.trim() || "cinematic wide shot";
  const mood = scene?.mood?.trim() || location?.mood?.trim() || campaign.tone.trim();
  const lighting = scene?.lighting?.trim() || location?.lighting?.trim() || "";
  const importantObjects = scene?.importantObjects?.trim() || "";

  // ----- Corrections -> continuity + negatives --------------------------
  const activeCorrections = corrections.filter((c) => c.active);
  // High-priority corrections are emphasised first.
  const sortedCorrections = [...activeCorrections].sort(
    (a, b) => priorityRank(b.priority) - priorityRank(a.priority)
  );
  const correctionNegatives: string[] = [];
  for (const c of sortedCorrections) {
    const note = c.target ? `${c.target}: ${c.correction}` : c.correction;
    continuityNotes.push(note.trim());
    // Pull out "not X" / "never X" exclusions into the negative prompt.
    const exclusions = extractExclusions(c.correction);
    correctionNegatives.push(...exclusions);
  }

  // ----- Continuity reminders from canonical details --------------------
  for (const c of activeChars) {
    if (c.signatureItems.length) {
      continuityNotes.push(
        `${c.name} has ${c.signatureItems.join(", ")}.`
      );
    }
  }
  if (locationName && locationDesc) {
    continuityNotes.push(`${locationName}: ${locationDesc}`);
  }

  // ----- Negative prompt -------------------------------------------------
  const spoilerNegatives: string[] = [];
  if (!reveal) {
    spoilerNegatives.push(
      "hidden monsters",
      "unrevealed villains",
      "secret items not yet discovered"
    );
  }
  const negativePrompt = dedupe([
    ...correctionNegatives,
    ...spoilerNegatives,
    ...DEFAULT_NEGATIVES,
  ]).join(", ");

  // ----- SHORT PROMPT ----------------------------------------------------
  const shortParts: string[] = [];
  if (style) shortParts.push(capitalize(stripPeriod(style)));
  const sceneSentence: string[] = [];
  if (locationDesc || locationName) {
    sceneSentence.push(`Inside ${lc(stripPeriod(locationDesc || locationName))}`);
  }
  if (charPhrases.length) {
    sceneSentence.push(charPhrases.map(stripPeriod).join("; "));
  }
  const primaryAction = sceneAction || eventPhrases[0] || "";
  if (primaryAction) sceneSentence.push(stripPeriod(primaryAction));
  if (sceneSentence.length) shortParts.push(joinSentences([sceneSentence.join(", ")]));
  const shortTail = [lighting, mood && `${mood} mood`, camera]
    .filter(Boolean)
    .map(stripPeriod)
    .join(", ");
  if (shortTail) shortParts.push(capitalize(shortTail));
  const shortPrompt = cleanup(joinSentences(shortParts));

  // ----- EXPANDED PROMPT -------------------------------------------------
  const expandedParts: string[] = [];
  if (style) expandedParts.push(capitalize(stripPeriod(style)) + ".");

  if (locationDesc || locationName) {
    expandedParts.push(
      joinSentences([`The scene takes place inside ${lc(stripPeriod(locationDesc || locationName))}`])
    );
  }

  if (charPhrases.length) {
    expandedParts.push(
      joinSentences([`Present in the scene: ${joinPhrases(charPhrases)}`])
    );
  }

  if (primaryAction) {
    expandedParts.push(joinSentences([stripPeriod(primaryAction)]));
  }
  // Remaining notable events as supporting action.
  const supporting = eventPhrases.filter((p) => p !== primaryAction).slice(0, 3);
  if (supporting.length) {
    expandedParts.push(joinSentences([`Recent moments: ${joinPhrases(supporting)}`]));
  }

  if (importantObjects) {
    expandedParts.push(joinSentences([`Important objects: ${stripPeriod(importantObjects)}`]));
  }

  const atmosphere = [
    lighting && `Lighting: ${lighting}`,
    mood && `Mood: ${mood}`,
    `Camera: ${camera}`,
    "composition: dramatic and balanced, clear focal point",
  ]
    .filter(Boolean)
    .join(". ");
  expandedParts.push(joinSentences([atmosphere]));

  let expandedPrompt = cleanup(expandedParts.join(" "));
  // Append continuity + exclusions block, mirroring the spec's example output.
  if (continuityNotes.length) {
    const notes = dedupe(continuityNotes)
      .map((n) => (/[.!?]$/.test(n) ? n : `${n}.`))
      .join(" ");
    expandedPrompt += `\nContinuity: ${notes}`;
  }
  expandedPrompt += `\nDo not show: ${negativePrompt}.`;

  return {
    shortPrompt,
    expandedPrompt,
    negativePrompt,
    continuityNotes: dedupe(continuityNotes),
    spoilerWarnings: dedupe(spoilerWarnings),
    source: "deterministic",
  };
}

// ----- helpers -------------------------------------------------------------

function priorityRank(p: string): number {
  switch (p.toLowerCase()) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

/**
 * Extract negative-prompt exclusions from a correction sentence.
 * e.g. "Thorne's armor is dented silver, never black armor." -> ["black armor"]
 */
function extractExclusions(text: string): string[] {
  const out: string[] = [];
  const patterns = [/\bnever\s+([^.,;]+)/gi, /\bnot\s+([^.,;]+)/gi, /\bno\s+([^.,;]+)/gi];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const phrase = m[1].trim();
      if (phrase && phrase.length < 60) out.push(phrase);
    }
  }
  return out;
}
