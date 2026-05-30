import { prisma } from "@/lib/db";
import { ok, created, badRequest, readJson } from "@/lib/apiHelpers";
import { coerceList, stringifyList } from "@/lib/json";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const locations = await prisma.location.findMany({
    where: { campaignId: params.id },
    orderBy: { name: "asc" },
  });
  return ok(locations);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const name = String(body.name ?? "").trim();
  if (!name) return badRequest("Location name is required.");

  const location = await prisma.location.create({
    data: {
      campaignId: params.id,
      name,
      type: String(body.type ?? ""),
      description: String(body.description ?? ""),
      mood: String(body.mood ?? ""),
      landmarks: String(body.landmarks ?? ""),
      lighting: String(body.lighting ?? ""),
      weather: String(body.weather ?? ""),
      hiddenFeatures: String(body.hiddenFeatures ?? ""),
      publicDescription: String(body.publicDescription ?? ""),
      privateNotes: String(body.privateNotes ?? ""),
      canonicalImageRefs: stringifyList(coerceList(body.canonicalImageRefs)),
    },
  });
  return created(location);
}
