import { prisma } from "@/lib/db";
import { created, ok, badRequest, readJson } from "@/lib/apiHelpers";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { characters: true, locations: true, scenes: true, events: true },
      },
    },
  });
  return ok(campaigns);
}

export async function POST(req: Request) {
  const body = await readJson<Record<string, string>>(req);
  if (!body.name || !body.name.trim()) {
    return badRequest("Campaign name is required.");
  }
  const campaign = await prisma.campaign.create({
    data: {
      name: body.name.trim(),
      genre: body.genre ?? "",
      tone: body.tone ?? "",
      visualStyle: body.visualStyle ?? "",
      contentRating: body.contentRating ?? "",
      styleReferences: body.styleReferences ?? "",
    },
  });
  return created(campaign);
}
