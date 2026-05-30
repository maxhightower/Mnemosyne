import { prisma } from "@/lib/db";
import { ok, created, badRequest, readJson } from "@/lib/apiHelpers";
import { coerceList, stringifyList, stringifyObject } from "@/lib/json";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const events = await prisma.sessionEvent.findMany({
    where: { campaignId: params.id },
    orderBy: { timestamp: "desc" },
  });
  return ok(events);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const rawText = String(body.rawText ?? "").trim();
  if (!rawText && !body.structuredSummary) {
    return badRequest("Event raw text or summary is required.");
  }

  const importance = Number(body.visualImportance ?? 3);
  const event = await prisma.sessionEvent.create({
    data: {
      campaignId: params.id,
      sceneId: body.sceneId ? String(body.sceneId) : null,
      speaker: String(body.speaker ?? ""),
      eventType: String(body.eventType ?? "DM narration"),
      rawText,
      structuredSummary: String(body.structuredSummary ?? ""),
      charactersInvolved: stringifyList(coerceList(body.charactersInvolved)),
      locationInvolved: String(body.locationInvolved ?? ""),
      mechanicalResult: stringifyObject(body.mechanicalResult ?? ""),
      visualImportance: Math.min(5, Math.max(1, Number.isNaN(importance) ? 3 : importance)),
      spoilerSafe: body.spoilerSafe === undefined ? true : Boolean(body.spoilerSafe),
      dmApproved: Boolean(body.dmApproved ?? false),
    },
  });
  return created(event);
}
