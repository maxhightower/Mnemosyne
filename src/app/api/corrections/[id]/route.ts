import { prisma } from "@/lib/db";
import { ok, readJson } from "@/lib/apiHelpers";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readJson<Record<string, unknown>>(req);
  const data: Record<string, unknown> = {};
  for (const f of ["correctionType", "target", "correction", "priority"]) {
    if (body[f] !== undefined) data[f] = String(body[f]);
  }
  if (body.active !== undefined) data.active = Boolean(body.active);

  const correction = await prisma.correction.update({
    where: { id: params.id },
    data,
  });
  return ok(correction);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.correction.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
