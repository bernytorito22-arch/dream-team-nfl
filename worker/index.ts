import { generateRoomCode } from "../src/room/codes";
import type { TurnMode } from "../src/league/types";
import type { Room } from "./room";
import { handleReveal } from "./revealHttp";

export type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ROOMS: DurableObjectNamespace<Room>;
  AI: {
    run: (
      model: string,
      input: {
        messages: { role: string; content: string }[];
        reasoning_effort?: "low" | "medium" | "high";
        max_tokens?: number;
      },
    ) => Promise<{
      response?: string;
      choices?: { message?: { content?: string } }[];
    }>;
  };
};

export { Room } from "./room";
export { handleReveal } from "./revealHttp";

async function handleCreateRoom(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const body = (await request.json()) as { name?: string; turnMode?: TurnMode };
  const hostName = body.name?.trim() || "Player 1";
  const turnMode: TurnMode = body.turnMode === "snake" ? "snake" : "roundRobin";

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    const id = env.ROOMS.idFromName(code);
    const stub = env.ROOMS.get(id);
    const created = await stub.createHost({ code, hostName, turnMode });
    if (created.ok) {
      return Response.json({
        code,
        playerId: created.playerId,
        seatToken: created.seatToken,
      });
    }
  }
  return Response.json({ error: "Could not create room" }, { status: 503 });
}

function handleRoomWebSocket(request: Request, env: Env, code: string): Promise<Response> {
  const id = env.ROOMS.idFromName(code.toUpperCase());
  const stub = env.ROOMS.get(id);
  return stub.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/reveal") {
      return handleReveal(request, env);
    }

    if (url.pathname === "/api/room") {
      return handleCreateRoom(request, env);
    }

    const wsMatch = url.pathname.match(/^\/api\/room\/([A-Za-z0-9]{4})\/ws$/);
    if (wsMatch) {
      return handleRoomWebSocket(request, env, wsMatch[1]!.toUpperCase());
    }

    const asset = await env.ASSETS.fetch(request);
    const isHtml =
      url.pathname === "/" ||
      url.pathname.startsWith("/r/") ||
      url.pathname.endsWith(".html") ||
      (asset.headers.get("content-type") ?? "").includes("text/html");
    if (!isHtml) return asset;
    const html = new Response(asset.body, asset);
    html.headers.set("Cache-Control", "no-cache");
    return html;
  },
};
