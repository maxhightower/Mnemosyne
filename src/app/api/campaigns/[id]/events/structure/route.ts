import { prisma } from "@/lib/db";
import { ok, badRequest, readJson } from "@/lib/apiHelpers";
import { aiEnabled, structureEvent } from "@/lib/ai";
import { structureEventFallback } from "@/lib/structureFallback";

// POST /api/campaigns/[id]/events/structure
// Turns raw session text into a structured event draft. Uses the LLM when a key
// is configured, otherwise the deterministic fallback. Does NOT persist — the
// DM reviews/edits then saves via the events endpoint.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<{ rawText?: string }>(req);
  const rawText = String(body.rawText ?? "").trim();
  if (!rawText) return badRequest("rawText is required.");

  const [characters, locations] = await Promise.all([
    prisma.character.findMany({
      where: { campaignId: params.id },
      select: { name: true },
    }),
    prisma.location.findMany({
      where: { campaignId: params.id },
      select: { name: true },
    }),
  ]);
  const hints = {
    knownCharacters: characters.map((c) => c.name),
    knownLocations: locations.map((l) => l.name),
  };

  if (aiEnabled()) {
    try {
      const structured = await structureEvent(rawText, hints);
      return ok({ ...structured, source: "ai" });
    } catch (err) {
      console.warn("AI structuring failed, using fallback:", err);
    }
  }
  const structured = structureEventFallback(rawText, hints);
  return ok({ ...structured, source: "deterministic" });
}
