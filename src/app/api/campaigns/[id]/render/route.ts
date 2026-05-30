import { ok, badRequest, readJson, serverError } from "@/lib/apiHelpers";
import { getImageProvider } from "@/lib/providers/image";
import { saveAsset } from "@/lib/assets";

// POST /api/campaigns/[id]/render
// Body: { positive, negative?, width?, height?, seed?, steps?, cfg? }
// Renders an image via the configured image provider and stores it as a
// content-addressed asset. Synchronous for now (MockProvider is instant); real
// GPU rendering will move behind the async RenderJob worker (Phase 5).
export async function POST(req: Request, _ctx: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const positive = String(body.positive ?? "").trim();
  if (!positive) return badRequest("A positive prompt is required to render.");

  const provider = getImageProvider();
  try {
    const result = await provider.txt2img({
      positive,
      negative: String(body.negative ?? ""),
      width: Number(body.width ?? 1024),
      height: Number(body.height ?? 1024),
      seed: body.seed !== undefined ? Number(body.seed) : undefined,
      steps: body.steps !== undefined ? Number(body.steps) : undefined,
      cfg: body.cfg !== undefined ? Number(body.cfg) : undefined,
    });
    const asset = await saveAsset(result.bytes, result.ext);
    return ok({ ...asset, provider: provider.name, meta: result.meta ?? {} });
  } catch (e) {
    return serverError(`Render failed: ${(e as Error).message}`);
  }
}
