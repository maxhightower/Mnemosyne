import { ok, notFound, readJson } from "@/lib/apiHelpers";
import { buildPromptInput } from "@/lib/buildPromptInput";
import { generatePromptSmart, aiEnabled } from "@/lib/ai";

// POST /api/campaigns/[id]/generate
// Body: { sceneId?: string, ai?: boolean }
// Generates (but does not save) short + expanded prompts from current state.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<{ sceneId?: string; ai?: boolean }>(req);
  const input = await buildPromptInput(params.id, body.sceneId);
  if (!input) return notFound("Campaign or scene not found.");

  const preferAI = Boolean(body.ai) && aiEnabled();
  const output = await generatePromptSmart(input, preferAI);
  return ok({ ...output, aiAvailable: aiEnabled(), sceneId: input.scene?.id ?? null });
}
