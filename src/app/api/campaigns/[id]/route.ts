import { prisma } from "@/lib/db";
import { ok, notFound, readJson, pickDefined } from "@/lib/apiHelpers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          characters: true,
          locations: true,
          scenes: true,
          events: true,
          prompts: true,
          corrections: true,
          visualReferences: true,
        },
      },
    },
  });
  if (!campaign) return notFound("Campaign not found.");
  return ok(campaign);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const data = pickDefined(body, [
    "name",
    "genre",
    "tone",
    "visualStyle",
    "contentRating",
    "styleReferences",
  ]);
  const campaign = await prisma.campaign.update({
    where: { id: params.id },
    data,
  });
  return ok(campaign);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.campaign.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
