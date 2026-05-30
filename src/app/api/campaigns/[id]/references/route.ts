import { prisma } from "@/lib/db";
import { ok, created, readJson } from "@/lib/apiHelpers";
import { coerceList, stringifyList } from "@/lib/json";
import { generateImage, imageGenEnabled } from "@/lib/imageGen";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const refs = await prisma.visualReference.findMany({
    where: { campaignId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return ok(refs);
}

// Save a prompt (and optionally a generated image) as a canonical reference.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const promptText = String(body.promptText ?? "");

  // Optionally attempt image generation (stubbed for MVP).
  let imageUrl = String(body.imageUrl ?? "");
  let note = String(body.notes ?? "");
  if (!imageUrl && body.generateImage && imageGenEnabled()) {
    const result = await generateImage({
      expandedPrompt: promptText,
      negativePrompt: String(body.negativePrompt ?? ""),
    });
    if (result.imageUrl) imageUrl = result.imageUrl;
    if (result.note) note = note ? `${note}\n${result.note}` : result.note;
  }

  const ref = await prisma.visualReference.create({
    data: {
      campaignId: params.id,
      sceneId: body.sceneId ? String(body.sceneId) : null,
      promptText,
      imageUrl,
      relatedCharacters: stringifyList(coerceList(body.relatedCharacters)),
      relatedLocation: String(body.relatedLocation ?? ""),
      approvedByDm: body.approvedByDm === undefined ? true : Boolean(body.approvedByDm),
      notes: note,
    },
  });
  return created(ref);
}
