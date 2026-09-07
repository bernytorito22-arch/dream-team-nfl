import { SLOT_DEFS } from "../league/ids";
import { normalizeAssetName, takenNameSet } from "../league/names";
import type { DreamTeam, League, LeagueAsset, LeagueTeam, SlotId } from "../league/types";

export function emptySlots(dreamTeam: DreamTeam): SlotId[] {
  const filled = new Set(dreamTeam.picks.map((p) => p.slotId));
  return SLOT_DEFS.filter((s) => !filled.has(s.id)).map((s) => s.id);
}

export function assetFitsSlot(asset: LeagueAsset, slotId: SlotId): boolean {
  const def = SLOT_DEFS.find((s) => s.id === slotId);
  return def !== undefined && def.group === asset.group;
}

export function legalMenu(
  league: League,
  dreamTeam: DreamTeam,
  takenAssetIds: string[],
  teamId: string,
  customAssets: LeagueAsset[] = [],
): LeagueAsset[] {
  const team = league.teams.find((t) => t.id === teamId);
  if (!team) return [];
  if (dreamTeam.picks.some((p) => p.teamId === teamId)) return [];
  const taken = new Set(takenAssetIds);
  const takenNames = takenNameSet(league, takenAssetIds, customAssets);
  const open = emptySlots(dreamTeam);
  return team.assets.filter((asset) => {
    if (taken.has(asset.id)) return false;
    if (takenNames.has(normalizeAssetName(asset.name))) return false;
    return open.some((slot) => assetFitsSlot(asset, slot));
  });
}

export function legalTeamsForPlayer(
  league: League,
  dreamTeam: DreamTeam,
  _takenAssetIds: string[] = [],
): LeagueTeam[] {
  if (emptySlots(dreamTeam).length === 0) return [];
  return league.teams.filter((team) => !dreamTeam.picks.some((p) => p.teamId === team.id));
}
