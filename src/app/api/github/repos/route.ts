import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listRepos } from "@/lib/github";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const repos = await listRepos(session.accessToken);
    return NextResponse.json({ repos });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 502 }
    );
  }
}
