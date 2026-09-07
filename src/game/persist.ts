import type { GameState } from "./engine";

export const STORAGE_KEY = "dream-team-nfl-v1";

export type LoadResult =
  | { ok: true; state: GameState }
  | { ok: false; notice: "corrupt" }
  | { ok: false; notice: "missing" };

export function saveGame(state: GameState, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearGame(storage: Storage = localStorage): void {
  storage.removeItem(STORAGE_KEY);
}

export function loadGame(storage: Storage = localStorage): LoadResult {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { ok: false, notice: "missing" };
  try {
    const state = JSON.parse(raw) as GameState;
    if (!Array.isArray(state.players) || !Array.isArray(state.dreamTeams)) {
      return { ok: false, notice: "corrupt" };
    }
    if (!Array.isArray(state.customAssets)) state.customAssets = [];
    return { ok: true, state };
  } catch {
    return { ok: false, notice: "corrupt" };
  }
}
