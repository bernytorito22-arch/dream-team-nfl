import type { Verdict } from "../ai/schema";
import { normalizeAssetName, takenNameSet } from "../league/names";
import type {
  DreamTeam,
  League,
  LeagueAsset,
  MenuGroup,
  PlayerSetup,
  SlotId,
  TurnMode,
} from "../league/types";
import { assetFitsSlot, legalMenu, legalTeamsForPlayer } from "./eligibility";
import { buildTurnOrder } from "./turnOrder";

export type WriteInDraft = {
  name: string;
  group: MenuGroup;
};

function isUnitGroup(group: MenuGroup): boolean {
  return group === "def" || group === "oline" || group === "coach";
}

export function makeWriteInAsset(teamId: string, group: MenuGroup, name: string): LeagueAsset {
  const slug = normalizeAssetName(name).replace(/ /g, "-").slice(0, 48) || "player";
  return {
    id: `writein-${teamId}-${group}-${slug}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    kind: isUnitGroup(group) ? "unit" : "player",
    group,
    teamId,
  };
}

export type GamePhase =
  | "spin"
  | "pick"
  | "revealReady"
  | "scored"
  | "tied";

export type GameState = {
  players: PlayerSetup[];
  turnMode: TurnMode;
  turnIndex: number;
  turnOrder: string[];
  dreamTeams: DreamTeam[];
  takenAssetIds: string[];
  customAssets: LeagueAsset[];
  currentTeamId: string | null;
  spinning: boolean;
  phase: GamePhase;
  verdict: Verdict | null;
  emptyLegal: boolean;
  saveNotice: "none" | "corrupt";
};

export function createSetupDefaults(count: number): PlayerSetup[] {
  if (count < 2 || count > 6) throw new Error("Player count must be 2-6");
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
  }));
}

export function currentPlayerId(state: GameState): string {
  return state.turnOrder[state.turnIndex];
}

export function dreamTeamOf(state: GameState, playerId: string): DreamTeam {
  const dt = state.dreamTeams.find((d) => d.playerId === playerId);
  if (!dt) throw new Error(`Missing dream team ${playerId}`);
  return dt;
}

export function startGame(players: PlayerSetup[], turnMode: TurnMode): GameState {
  return {
    players,
    turnMode,
    turnIndex: 0,
    turnOrder: buildTurnOrder(players.map((p) => p.id), turnMode, 9),
    dreamTeams: players.map((p) => ({ playerId: p.id, name: p.name, picks: [] })),
    takenAssetIds: [],
    customAssets: [],
    currentTeamId: null,
    spinning: false,
    phase: "spin",
    verdict: null,
    emptyLegal: false,
    saveNotice: "none",
  };
}

export function beginSpin(state: GameState): GameState {
  if (state.phase !== "spin" || state.spinning) return state;
  return { ...state, spinning: true, emptyLegal: false };
}

export function completeSpin(
  state: GameState,
  league: League,
  rng: () => number,
): GameState {
  if (!state.spinning) return state;
  const playerId = currentPlayerId(state);
  const legal = legalTeamsForPlayer(league, dreamTeamOf(state, playerId), state.takenAssetIds);
  if (legal.length === 0) {
    return { ...state, spinning: false, emptyLegal: true, currentTeamId: null, phase: "spin" };
  }
  const idx = Math.min(legal.length - 1, Math.floor(rng() * legal.length));
  return {
    ...state,
    spinning: false,
    emptyLegal: false,
    currentTeamId: legal[idx].id,
    phase: "pick",
  };
}

export function lockPick(
  state: GameState,
  league: League,
  assetId: string,
  slotId: SlotId,
  writeIn?: WriteInDraft,
): GameState {
  if (state.phase !== "pick" || !state.currentTeamId) return state;
  const playerId = currentPlayerId(state);
  const dt = dreamTeamOf(state, playerId);
  const custom = state.customAssets ?? [];
  const takenNames = takenNameSet(league, state.takenAssetIds, custom);

  let asset: LeagueAsset | undefined;
  let nextCustom = custom;
  if (writeIn) {
    const name = writeIn.name.trim();
    if (name.length < 2) return state;
    if (takenNames.has(normalizeAssetName(name))) return state;
    asset = makeWriteInAsset(state.currentTeamId, writeIn.group, name);
    if (!assetFitsSlot(asset, slotId)) return state;
    nextCustom = [...custom, asset];
  } else {
    const menu = legalMenu(league, dt, state.takenAssetIds, state.currentTeamId, custom);
    asset = menu.find((a) => a.id === assetId);
    if (!asset) return state;
    if (takenNames.has(normalizeAssetName(asset.name))) return state;
  }

  if (!assetFitsSlot(asset, slotId)) return state;
  if (dt.picks.some((p) => p.slotId === slotId || p.teamId === asset.teamId)) return state;
  const nextTeams = state.dreamTeams.map((team) =>
    team.playerId === playerId
      ? { ...team, picks: [...team.picks, { slotId, assetId: asset.id, teamId: asset.teamId }] }
      : team,
  );
  const nextIndex = state.turnIndex + 1;
  const done = nextIndex >= state.turnOrder.length;
  return {
    ...state,
    dreamTeams: nextTeams,
    takenAssetIds: [...state.takenAssetIds, asset.id],
    customAssets: nextCustom,
    currentTeamId: null,
    turnIndex: done ? state.turnIndex : nextIndex,
    phase: done ? "revealReady" : "spin",
    spinning: false,
  };
}

export function playAgain(state: GameState): GameState {
  return startGame(state.players, state.turnMode);
}

export function applyVerdict(state: GameState, verdict: Verdict): GameState {
  return {
    ...state,
    verdict,
    phase: verdict.recordsTied ? "tied" : "scored",
  };
}
