import { prisma } from "@/lib/db";
import { ok, readJson } from "@/lib/apiHelpers";
import { coerceList, stringifyList } from "@/lib/json";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const data: Record<string, unknown> = {};
  const stringFields = [
    "name",
    "type",
    "species",
    "classRole",
    "physicalAppearance",
    "clothingArmor",
    "personalityVisualCues",
    "currentCondition",
    "secrets",
    "publicDescription",
    "privateNotes",
  ];
  for (const f of stringFields) {
    if (body[f] !== undefined) data[f] = String(body[f]);
  }
  if (body.signatureItems !== undefined)
    data.signatureItems = stringifyList(coerceList(body.signatureItems));
  if (body.canonicalImageRefs !== undefined)
    data.canonicalImageRefs = stringifyList(coerceList(body.canonicalImageRefs));
  if (body.active !== undefined) data.active = Boolean(body.active);

  const character = await prisma.character.update({
    where: { id: params.id },
    data,
  });
  return ok(character);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.character.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
