import type { StructuredEvent } from "./ai";

// Deterministic, offline event structurer used when no AI key is configured (or
// the AI call fails). It does light pattern-matching on the raw text to fill in
// a reasonable structured event. It is intentionally conservative: the DM
// reviews and edits everything before approving.

const TYPE_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(casts?|casting|spell|incantation|magic missile|fireball)\b/i, "spell cast"],
  [/\b(attacks?|hits?|strikes?|swings?|charges?|stabs?|slash(es)?|shoots?)\b/i, "attack"],
  [/\b(rolls?|rolling|d20|nat\s?20|critical|saving throw)\b/i, "dice roll"],
  [/\b(says?|shouts?|whispers?|asks?|replies?|"|')\b/, "dialogue"],
  [/\b(finds?|discovers?|notices?|spots?|uncovers?)\b/i, "discovery"],
  [/\b(travels?|journeys?|heads?|walks?|rides?|enters?|arrives?)\b/i, "travel"],
  [/\b(enters?|scene|chamber|room|crypt|cave|forest)\b/i, "scene change"],
  [/\b(falls?|drops?|dies?|bloodied|unconscious|wounded|healed)\b/i, "character condition update"],
];

export function structureEventFallback(
  rawText: string,
  hints: { knownCharacters?: string[]; knownLocations?: string[] } = {}
): StructuredEvent {
  const text = rawText.trim();

  // Event type
  let eventType = "DM narration";
  for (const [re, type] of TYPE_KEYWORDS) {
    if (re.test(text)) {
      eventType = type;
      break;
    }
  }

  // Characters: match known names mentioned in the text.
  const charactersInvolved = (hints.knownCharacters ?? []).filter((n) =>
    n && new RegExp(`\\b${escapeRegExp(n)}\\b`, "i").test(text)
  );

  // Location: first known location mentioned.
  const locationInvolved =
    (hints.knownLocations ?? []).find((n) =>
      n && new RegExp(`\\b${escapeRegExp(n)}\\b`, "i").test(text)
    ) ?? "";

  // Mechanical result: pull out a roll and damage if present.
  const mechanicalResult = parseMechanics(text);

  // Visual importance heuristic.
  let visualImportance = 3;
  if (/\b(critical|nat\s?20|killing blow|slays?|dies?|climactic)\b/i.test(text))
    visualImportance = 5;
  else if (eventType === "attack" || eventType === "spell cast") visualImportance = 4;
  else if (eventType === "dialogue" || eventType === "dice roll") visualImportance = 2;

  return {
    eventType,
    structuredSummary: text,
    charactersInvolved,
    locationInvolved,
    mechanicalResult,
    visualImportance,
    possibleSpoilers: [],
    suggestedSceneUpdate: "",
  };
}

function parseMechanics(text: string): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};
  const roll = text.match(/\b(?:rolls?|rolling|hits?|with)\s+(?:a\s+)?(\d{1,2})\b/i);
  if (roll) result.roll = Number(roll[1]);
  const dmg = text.match(/\b(\d{1,3})\s+([a-z]+)?\s*damage\b/i);
  if (dmg) {
    result.damage = Number(dmg[1]);
    if (dmg[2]) result.damageType = dmg[2].toLowerCase();
  }
  if (/\bhits?\b/i.test(text)) result.result = "hit";
  else if (/\bmiss(es)?\b/i.test(text)) result.result = "miss";
  return Object.keys(result).length ? result : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
