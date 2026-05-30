import { prisma } from "@/lib/db";
import { ok, readJson } from "@/lib/apiHelpers";
import { coerceList, stringifyList, stringifyObject } from "@/lib/json";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const data: Record<string, unknown> = {};
  const stringFields = [
    "speaker",
    "eventType",
    "rawText",
    "structuredSummary",
    "locationInvolved",
  ];
  for (const f of stringFields) {
    if (body[f] !== undefined) data[f] = String(body[f]);
  }
  if (body.charactersInvolved !== undefined)
    data.charactersInvolved = stringifyList(coerceList(body.charactersInvolved));
  if (body.mechanicalResult !== undefined)
    data.mechanicalResult = stringifyObject(body.mechanicalResult);
  if (body.visualImportance !== undefined) {
    const n = Number(body.visualImportance);
    data.visualImportance = Math.min(5, Math.max(1, Number.isNaN(n) ? 3 : n));
  }
  if (body.spoilerSafe !== undefined) data.spoilerSafe = Boolean(body.spoilerSafe);
  if (body.dmApproved !== undefined) data.dmApproved = Boolean(body.dmApproved);

  const event = await prisma.sessionEvent.update({ where: { id: params.id }, data });
  return ok(event);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.sessionEvent.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
