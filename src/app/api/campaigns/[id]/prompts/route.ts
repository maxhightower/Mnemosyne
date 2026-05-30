import { prisma } from "@/lib/db";
import { ok, created, readJson } from "@/lib/apiHelpers";
import { stringifyList } from "@/lib/json";
import { coerceList } from "@/lib/json";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prompts = await prisma.visualPrompt.findMany({
    where: { campaignId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return ok(prompts);
}

// Persist a generated prompt for the record.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const prompt = await prisma.visualPrompt.create({
    data: {
      campaignId: params.id,
      sceneId: body.sceneId ? String(body.sceneId) : null,
      shortPrompt: String(body.shortPrompt ?? ""),
      expandedPrompt: String(body.expandedPrompt ?? ""),
      negativePrompt: String(body.negativePrompt ?? ""),
      continuityNotes: stringifyList(coerceList(body.continuityNotes)),
      spoilerWarnings: stringifyList(coerceList(body.spoilerWarnings)),
      source: String(body.source ?? "deterministic"),
    },
  });
  return created(prompt);
}
