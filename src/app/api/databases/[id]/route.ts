import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { destroyDatabase } from "@/lib/deployer";

/** DELETE /api/databases/:id — tear down a managed database. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const database = await prisma.database.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!database) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await destroyDatabase(database.agentId);
  await prisma.database.delete({ where: { id: database.id } });

  return NextResponse.json({ ok: true });
}
