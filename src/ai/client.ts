import { findAsset } from "../league/names";
import type { DreamTeam, League, LeagueAsset } from "../league/types";
import { parseVerdict } from "./parseVerdict";
import type { Verdict } from "./schema";

export const SCORE_ERROR = "Couldn't score this one — try again.";

export type RevealResult = { ok: true; verdict: Verdict } | { ok: false };

export function toRevealBody(
  dreamTeams: DreamTeam[],
  league: League,
  customAssets: LeagueAsset[] = [],
) {
  return {
    dreamTeams: dreamTeams.map((dt) => ({
      playerId: dt.playerId,
      name: dt.name,
      slots: dt.picks.map((p) => {
        const team = league.teams.find((t) => t.id === p.teamId);
        const asset = findAsset(league, customAssets, p.assetId);
        return {
          slotId: p.slotId,
          assetName: asset?.name ?? p.assetId,
          teamName: team?.name ?? p.teamId,
        };
      }),
    })),
  };
}

export async function fetchReveal(
  dreamTeams: DreamTeam[],
  league: League,
  customAssets: LeagueAsset[] = [],
  signal: AbortSignal = AbortSignal.timeout(55_000),
): Promise<RevealResult> {
  try {
    const res = await fetch("/api/reveal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toRevealBody(dreamTeams, league, customAssets)),
      signal,
    });
    if (!res.ok) return { ok: false };
    const json: unknown = await res.json();
    if (!json || typeof json !== "object" || !("ok" in json)) return { ok: false };
    const body = json as { ok: boolean; verdict?: unknown };
    if (!body.ok || body.verdict === undefined) return { ok: false };
    return {
      ok: true,
      verdict: parseVerdict(
        body.verdict,
        dreamTeams.map((d) => d.playerId),
        dreamTeams.map((d) => d.name),
      ),
    };
  } catch {
    return { ok: false };
  }
}
