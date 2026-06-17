import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { openAgentLogStream } from "@/lib/deployer";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/:slug/deployments/:id/logs  (SSE)
 *
 * Proxies the build agent's live log stream to the browser, and persists the
 * final logs + status to the database when the build finishes.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("unauthorized", { status: 401 });
  }
  const { slug, id } = await params;

  const deployment = await prisma.deployment.findFirst({
    where: { id, project: { slug, userId: session.user.id } },
  });
  if (!deployment) return new Response("not found", { status: 404 });

  const encoder = new TextEncoder();

  // No agent (simulated) or already finished — just replay stored logs.
  if (!deployment.agentId || deployment.status !== "building") {
    const stream = new ReadableStream({
      start(controller) {
        for (const line of deployment.logs) {
          controller.enqueue(encoder.encode(`event: line\ndata: ${JSON.stringify({ line })}\n\n`));
        }
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ status: deployment.status, url: deployment.liveUrl })}\n\n`
          )
        );
        controller.close();
      },
    });
    return sse(stream);
  }

  const agentRes = await openAgentLogStream(deployment.agentId);
  if (!agentRes.ok || !agentRes.body) {
    return new Response("agent unavailable", { status: 502 });
  }

  const startedAt = Date.now();
  const collected: string[] = [];
  const reader = agentRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      const chunk = decoder.decode(value, { stream: true });
      controller.enqueue(encoder.encode(chunk)); // forward verbatim to browser

      // Parse frames to collect lines and detect completion.
      buffer += chunk;
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const isLine = frame.includes("event: line");
        const isDone = frame.includes("event: done");
        const dataMatch = frame.match(/data: (.+)/);
        if (!dataMatch) continue;
        let data: { line?: string; status?: string; url?: string } = {};
        try {
          data = JSON.parse(dataMatch[1]);
        } catch {
          continue;
        }
        if (isLine && data.line) collected.push(data.line);
        if (isDone) {
          await prisma.deployment
            .update({
              where: { id: deployment.id },
              data: {
                status: data.status === "ready" ? "ready" : "failed",
                logs: collected,
                liveUrl: data.url ?? deployment.liveUrl,
                durationSec: Math.round((Date.now() - startedAt) / 1000),
              },
            })
            .catch(() => {});
          if (data.status === "ready") {
            await prisma.project
              .update({ where: { slug }, data: { status: "ready" } })
              .catch(() => {});
          }
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return sse(stream);
}

function sse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
