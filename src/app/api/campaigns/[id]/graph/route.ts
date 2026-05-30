import { prisma } from "@/lib/db";
import { ok, readJson } from "@/lib/apiHelpers";

// Single working graph per campaign for now (multi-graph is a later add).
// GET returns the campaign's graph (creating an empty one if needed).
// POST saves the graph's data (and optional name).

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let graph = await prisma.graph.findFirst({
    where: { campaignId: params.id },
    orderBy: { createdAt: "asc" },
  });
  if (!graph) {
    graph = await prisma.graph.create({ data: { campaignId: params.id } });
  }
  return ok(graph);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<{ id?: string; name?: string; data?: unknown }>(req);
  const dataStr =
    typeof body.data === "string" ? body.data : JSON.stringify(body.data ?? { nodes: [], edges: [] });

  const existing = await prisma.graph.findFirst({
    where: { campaignId: params.id },
    orderBy: { createdAt: "asc" },
  });

  const graph = existing
    ? await prisma.graph.update({
        where: { id: existing.id },
        data: { data: dataStr, ...(body.name ? { name: body.name } : {}) },
      })
    : await prisma.graph.create({
        data: { campaignId: params.id, data: dataStr, name: body.name ?? "Main graph" },
      });

  return ok(graph);
}
