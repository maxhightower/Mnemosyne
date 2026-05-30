import { prisma } from "@/lib/db";
import { ok, created, badRequest, readJson } from "@/lib/apiHelpers";
import { coerceList, stringifyList } from "@/lib/json";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const characters = await prisma.character.findMany({
    where: { campaignId: params.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return ok(characters);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const name = String(body.name ?? "").trim();
  if (!name) return badRequest("Character name is required.");

  const character = await prisma.character.create({
    data: {
      campaignId: params.id,
      name,
      type: String(body.type ?? "player character"),
      species: String(body.species ?? ""),
      classRole: String(body.classRole ?? ""),
      physicalAppearance: String(body.physicalAppearance ?? ""),
      clothingArmor: String(body.clothingArmor ?? ""),
      signatureItems: stringifyList(coerceList(body.signatureItems)),
      personalityVisualCues: String(body.personalityVisualCues ?? ""),
      currentCondition: String(body.currentCondition ?? ""),
      secrets: String(body.secrets ?? ""),
      publicDescription: String(body.publicDescription ?? ""),
      privateNotes: String(body.privateNotes ?? ""),
      canonicalImageRefs: stringifyList(coerceList(body.canonicalImageRefs)),
      active: body.active === undefined ? true : Boolean(body.active),
    },
  });
  return created(character);
}
