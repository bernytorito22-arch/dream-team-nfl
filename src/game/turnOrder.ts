import type { TurnMode } from "../league/types";

export function buildTurnOrder(
  playerIds: string[],
  mode: TurnMode,
  picksEach: number = 9,
): string[] {
  const order: string[] = [];
  const n = playerIds.length;
  for (let round = 0; round < picksEach; round++) {
    const forward = mode === "roundRobin" || round % 2 === 0;
    if (forward) {
      for (let i = 0; i < n; i++) order.push(playerIds[i]);
    } else {
      for (let i = n - 1; i >= 0; i--) order.push(playerIds[i]);
    }
  }
  return order;
}
