import { prisma } from "@/lib/db";
import { ok, created, badRequest, readJson } from "@/lib/apiHelpers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const corrections = await prisma.correction.findMany({
    where: { campaignId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return ok(corrections);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const correction = String(body.correction ?? "").trim();
  if (!correction) return badRequest("Correction text is required.");

  const record = await prisma.correction.create({
    data: {
      campaignId: params.id,
      correctionType: String(body.correctionType ?? "general"),
      target: String(body.target ?? ""),
      correction,
      priority: String(body.priority ?? "medium"),
      active: body.active === undefined ? true : Boolean(body.active),
    },
  });
  return created(record);
}
