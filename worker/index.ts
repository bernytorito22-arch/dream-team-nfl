import { SCORE_ERROR } from "../src/ai/client";
import { parseVerdict } from "../src/ai/parseVerdict";
import { revealPrompt } from "./prompt";

export type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
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

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0)
    throw new Error(`no json in: ${text.slice(0, 200)}`);
  return JSON.parse(text.slice(start, end + 1));
}

export async function handleReveal(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: SCORE_ERROR }, { status: 405 });
  }
  try {
    const body = (await request.json()) as {
      dreamTeams: { playerId: string; name: string; slots: { slotId: string; assetName: string; teamName: string }[] }[];
    };
    const playerIds = body.dreamTeams.map((d) => d.playerId);
    const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
      messages: [{ role: "user", content: revealPrompt(body.dreamTeams) }],
      reasoning_effort: "low",
      max_tokens: 8192,
    });
    const raw = String(
      result.response ?? result.choices?.[0]?.message?.content ?? "",
    );
    const verdict = parseVerdict(extractJson(raw), playerIds);
    return Response.json({ ok: true, verdict });
  } catch {
    return Response.json({ ok: false, error: SCORE_ERROR }, { status: 502 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/reveal") return handleReveal(request, env);
    const asset = await env.ASSETS.fetch(request);
    const isHtml =
      url.pathname === "/" ||
      url.pathname.endsWith(".html") ||
      (asset.headers.get("content-type") ?? "").includes("text/html");
    if (!isHtml) return asset;
    const html = new Response(asset.body, asset);
    html.headers.set("Cache-Control", "no-cache");
    return html;
  },
};
