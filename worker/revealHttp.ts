import { SCORE_ERROR } from "../src/ai/client";
import { runReveal, type RevealDreamTeam } from "./reveal";

export async function handleReveal(
  request: Request,
  env: { AI: Parameters<typeof runReveal>[0]["AI"] },
): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: SCORE_ERROR }, { status: 405 });
  }
  try {
    const body = (await request.json()) as { dreamTeams: RevealDreamTeam[] };
    const result = await runReveal(env, body.dreamTeams);
    if (!result.ok) {
      return Response.json({ ok: false, error: SCORE_ERROR }, { status: 502 });
    }
    return Response.json({ ok: true, verdict: result.verdict });
  } catch {
    return Response.json({ ok: false, error: SCORE_ERROR }, { status: 502 });
  }
}
