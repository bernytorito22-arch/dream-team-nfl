import { extractJson, extractModelText, parseVerdict } from "../src/ai/parseVerdict";
import type { Verdict } from "../src/ai/schema";
import { REVEAL_SYSTEM, revealPrompt } from "./prompt";

export const REVEAL_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

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
        max_tokens?: number;
        temperature?: number;
      },
    ) => Promise<unknown>;
  };
};

export async function runReveal(
  env: RevealEnv,
  dreamTeams: RevealDreamTeam[],
): Promise<{ ok: true; verdict: Verdict } | { ok: false }> {
  try {
    const playerIds = dreamTeams.map((d) => d.playerId);
    const result = await env.AI.run(REVEAL_MODEL, {
      messages: [
        { role: "system", content: REVEAL_SYSTEM },
        { role: "user", content: revealPrompt(dreamTeams) },
      ],
      max_tokens: 1536,
      temperature: 0.35,
    });
    const raw = extractModelText(result);
    const verdict = parseVerdict(extractJson(raw), playerIds);
    return { ok: true, verdict };
  } catch (err) {
    console.error("runReveal failed", err);
    return { ok: false };
  }
}
