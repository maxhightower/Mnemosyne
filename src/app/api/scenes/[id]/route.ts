import { prisma } from "@/lib/db";
import { ok, notFound, readJson } from "@/lib/apiHelpers";
import { coerceList, stringifyList } from "@/lib/json";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scene = await prisma.scene.findUnique({ where: { id: params.id } });
  if (!scene) return notFound("Scene not found.");
  return ok(scene);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const existing = await prisma.scene.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Scene not found.");

  const data: Record<string, unknown> = {};
  const stringFields = [
    "title",
    "importantObjects",
    "mood",
    "lighting",
    "cameraPreference",
    "visibleAction",
    "compositionNote",
    "hiddenInformation",
    "notes",
  ];
  for (const f of stringFields) {
    if (body[f] !== undefined) data[f] = String(body[f]);
  }
  if (body.locationId !== undefined)
    data.locationId = body.locationId ? String(body.locationId) : null;
  if (body.presentCharacterIds !== undefined)
    data.presentCharacterIds = stringifyList(coerceList(body.presentCharacterIds));
  if (body.referenceImages !== undefined)
    data.referenceImages = stringifyList(coerceList(body.referenceImages));
  if (body.revealHidden !== undefined) data.revealHidden = Boolean(body.revealHidden);

  // Activating this scene deactivates the others in the same campaign.
  if (body.isActive !== undefined) {
    const active = Boolean(body.isActive);
    data.isActive = active;
    if (active) {
      await prisma.scene.updateMany({
        where: { campaignId: existing.campaignId, id: { not: existing.id } },
        data: { isActive: false },
      });
    }
  }

  const scene = await prisma.scene.update({ where: { id: params.id }, data });
  return ok(scene);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.scene.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
