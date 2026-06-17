import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listBranches } from "@/lib/github";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const repo = req.nextUrl.searchParams.get("repo");
  if (!repo) {
    return NextResponse.json({ error: "missing repo" }, { status: 400 });
  }
  try {
    const branches = await listBranches(session.accessToken, repo);
    return NextResponse.json({ branches });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
