import { prisma } from "@/lib/db";
import { ok, readJson } from "@/lib/apiHelpers";
import { coerceList, stringifyList } from "@/lib/json";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const data: Record<string, unknown> = {};
  const stringFields = [
    "name",
    "type",
    "description",
    "mood",
    "landmarks",
    "lighting",
    "weather",
    "hiddenFeatures",
    "publicDescription",
    "privateNotes",
  ];
  for (const f of stringFields) {
    if (body[f] !== undefined) data[f] = String(body[f]);
  }
  if (body.canonicalImageRefs !== undefined)
    data.canonicalImageRefs = stringifyList(coerceList(body.canonicalImageRefs));

  const location = await prisma.location.update({ where: { id: params.id }, data });
  return ok(location);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.location.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
