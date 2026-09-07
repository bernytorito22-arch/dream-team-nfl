import { TEAM_IDS } from "./ids";
import type { League, MenuGroup } from "./types";

const MIN: Record<MenuGroup, number> = {
  qb: 1,
  rb: 1,
  wr: 2,
  te: 1,
  defPlayer: 2,
  def: 1,
  oline: 1,
  coach: 1,
};

const MAX: Record<MenuGroup, number> = {
  qb: 2,
  rb: 2,
  wr: 3,
  te: 1,
  defPlayer: 3,
  def: 1,
  oline: 1,
  coach: 1,
};

export function assertLeague(league: League): void {
  if (league.season !== 2026) throw new Error("season");
  if (league.teams.length !== 32) throw new Error("need 32 teams");
  const ids = league.teams.map((t) => t.id).sort();
  if (ids.join() !== [...TEAM_IDS].sort().join()) throw new Error("team ids");
  const assetIds = new Set<string>();
  for (const team of league.teams) {
    const counts: Partial<Record<MenuGroup, number>> = {};
    for (const a of team.assets) {
      if (a.teamId !== team.id) throw new Error(`teamId ${a.id}`);
      if (assetIds.has(a.id)) throw new Error(`dup ${a.id}`);
      assetIds.add(a.id);
      counts[a.group] = (counts[a.group] ?? 0) + 1;
    }
    (Object.keys(MIN) as MenuGroup[]).forEach((g) => {
      const n = counts[g] ?? 0;
      if (n < MIN[g] || n > MAX[g]) throw new Error(`${team.id} ${g} ${n}`);
    });
  }
  const lar = league.teams.find((t) => t.id === "lar");
  const names = (lar?.assets ?? []).map((a) => a.name);
  if (!names.includes("Aaron Donald")) throw new Error("Donald missing");
  if (!names.includes("Myles Garrett")) throw new Error("Garrett missing");
}
