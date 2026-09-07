import type { League } from "../league/types";
import type { GameState } from "../game/engine";
import { beginSpin, completeSpin } from "../game/engine";

export function spinAndLand(
  state: GameState,
  league: League,
  rng: () => number,
): GameState {
  return completeSpin(beginSpin(state), league, rng);
}
