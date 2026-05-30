import { prisma } from "@/lib/db";
import { ok, readJson } from "@/lib/apiHelpers";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const data: Record<string, unknown> = {};
  for (const f of ["notes", "imageUrl", "relatedLocation"]) {
    if (body[f] !== undefined) data[f] = String(body[f]);
  }
  if (body.approvedByDm !== undefined) data.approvedByDm = Boolean(body.approvedByDm);
  const ref = await prisma.visualReference.update({ where: { id: params.id }, data });
  return ok(ref);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.visualReference.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
