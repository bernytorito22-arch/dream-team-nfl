import { parseVerdict } from "../src/ai/parseVerdict";
import type { Verdict } from "../src/ai/schema";
import { revealPrompt } from "./prompt";

export type RevealDreamTeam = {
  playerId: string;
  name: string;
  slots: { slotId: string; assetName: string; teamName: string }[];
};

export type RevealEnv = {
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
  if (start < 0 || end < 0) throw new Error(`no json in: ${text.slice(0, 200)}`);
  return JSON.parse(text.slice(start, end + 1));
}

export async function runReveal(
  env: RevealEnv,
  dreamTeams: RevealDreamTeam[],
): Promise<{ ok: true; verdict: Verdict } | { ok: false }> {
  try {
    const playerIds = dreamTeams.map((d) => d.playerId);
    const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
      messages: [{ role: "user", content: revealPrompt(dreamTeams) }],
      reasoning_effort: "low",
      max_tokens: 8192,
    });
    const raw = String(result.response ?? result.choices?.[0]?.message?.content ?? "");
    const verdict = parseVerdict(extractJson(raw), playerIds);
    return { ok: true, verdict };
  } catch {
    return { ok: false };
  }
}
