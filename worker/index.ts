import { SCORE_ERROR } from "../src/ai/client";
import { extractJson, modelText } from "../src/ai/extractModel";
import { parseVerdict } from "../src/ai/parseVerdict";
import { revealPrompt } from "./prompt";

export const REVEAL_MODEL = "@cf/zai-org/glm-4.7-flash";

export type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  AI: {
    run: (
      model: string,
      input: {
        messages: { role: string; content: string }[];
        chat_template_kwargs?: { enable_thinking?: boolean };
        response_format?: { type: string };
        max_tokens?: number;
      },
    ) => Promise<{
      response?: string;
      choices?: { message?: { content?: string | { text?: string }[] } }[];
    }>;
  };
};

export async function handleReveal(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: SCORE_ERROR }, { status: 405 });
  }
  try {
    const body = (await request.json()) as {
      dreamTeams: { playerId: string; name: string; slots: { slotId: string; assetName: string; teamName: string }[] }[];
    };
    const playerIds = body.dreamTeams.map((d) => d.playerId);
    const displayNames = body.dreamTeams.map((d) => d.name);
    const messages = [{ role: "user", content: revealPrompt(body.dreamTeams) }];
    const baseInput = {
      messages,
      chat_template_kwargs: { enable_thinking: false } as const,
      max_tokens: 2048,
    };
    let result: Awaited<ReturnType<Env["AI"]["run"]>>;
    try {
      result = await env.AI.run(REVEAL_MODEL, {
        ...baseInput,
        response_format: { type: "json_object" },
      });
    } catch {
      result = await env.AI.run(REVEAL_MODEL, baseInput);
    }
    const verdict = parseVerdict(extractJson(modelText(result)), playerIds, displayNames);
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
