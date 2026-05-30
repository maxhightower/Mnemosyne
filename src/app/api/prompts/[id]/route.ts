import { prisma } from "@/lib/db";
import { ok } from "@/lib/apiHelpers";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.visualPrompt.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
