import type { League, LeagueAsset } from "./types";

export function normalizeAssetName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findAsset(
  league: League,
  customAssets: LeagueAsset[],
  assetId: string,
): LeagueAsset | undefined {
  for (const team of league.teams) {
    const hit = team.assets.find((a) => a.id === assetId);
    if (hit) return hit;
  }
  return customAssets.find((a) => a.id === assetId);
}

export function takenNameSet(
  league: League,
  takenAssetIds: string[],
  customAssets: LeagueAsset[],
): Set<string> {
  const names = new Set<string>();
  for (const id of takenAssetIds) {
    const asset = findAsset(league, customAssets, id);
    if (asset) names.add(normalizeAssetName(asset.name));
  }
  return names;
}
