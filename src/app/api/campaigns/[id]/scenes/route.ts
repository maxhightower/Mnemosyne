import { prisma } from "@/lib/db";
import { ok, created, readJson } from "@/lib/apiHelpers";
import { coerceList, stringifyList } from "@/lib/json";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scenes = await prisma.scene.findMany({
    where: { campaignId: params.id },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });
  return ok(scenes);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const makeActive = body.isActive === undefined ? true : Boolean(body.isActive);

  if (makeActive) {
    await prisma.scene.updateMany({
      where: { campaignId: params.id },
      data: { isActive: false },
    });
  }

  const scene = await prisma.scene.create({
    data: {
      campaignId: params.id,
      title: String(body.title ?? "Current Scene"),
      locationId: body.locationId ? String(body.locationId) : null,
      presentCharacterIds: stringifyList(coerceList(body.presentCharacterIds)),
      importantObjects: String(body.importantObjects ?? ""),
      mood: String(body.mood ?? ""),
      lighting: String(body.lighting ?? ""),
      cameraPreference: String(body.cameraPreference ?? ""),
      visibleAction: String(body.visibleAction ?? ""),
      hiddenInformation: String(body.hiddenInformation ?? ""),
      revealHidden: Boolean(body.revealHidden ?? false),
      notes: String(body.notes ?? ""),
      isActive: makeActive,
    },
  });
  return created(scene);
}
