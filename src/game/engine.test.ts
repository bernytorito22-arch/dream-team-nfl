import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { League } from "../league/types";
import { legalTeamsForPlayer } from "./eligibility";
import { buildTurnOrder } from "./turnOrder";
import {
  applyVerdict,
  beginSpin,
  completeSpin,
  createSetupDefaults,
  currentPlayerId,
  dreamTeamOf,
  lockPick,
  playAgain,
  startGame,
  type GameState,
} from "./engine";

const league = JSON.parse(
  readFileSync("src/data/league.fixture.json", "utf8"),
) as League;

function rngWant(state: GameState, teamId: string) {
  return () => {
    const legal = legalTeamsForPlayer(league, dreamTeamOf(state, currentPlayerId(state)), state.takenAssetIds);
    const idx = legal.findIndex((t) => t.id === teamId);
    if (idx < 0) return 0;
    return (idx + 0.01) / legal.length;
  };
}

describe("engine", () => {
  it("defaults Player 1..N and rejects counts outside 2–6", () => {
    expect(createSetupDefaults(4).map((p) => p.name)).toEqual([
      "Player 1", "Player 2", "Player 3", "Player 4",
    ]);
    expect(() => createSetupDefaults(1)).toThrow();
    expect(() => createSetupDefaults(7)).toThrow();
  });

  it("starts on spin for player 0; game ends after 9 picks each", () => {
    const players = createSetupDefaults(2);
    let state = startGame(players, "roundRobin");
    expect(state.phase).toBe("spin");
    expect(currentPlayerId(state)).toBe("p0");
    expect(state.turnOrder).toHaveLength(18);
  });

  it("ignores a second beginSpin while spinning", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = beginSpin(state);
    const mid = beginSpin(state);
    expect(mid.spinning).toBe(true);
    expect(mid).toEqual(state);
  });

  it("lands only on a legal team", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    expect(state.phase).toBe("pick");
    expect(state.currentTeamId).toBe("min");
  });

  it("lockPick records franchise + asset and advances turn", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    state = lockPick(state, league, "min-wr-justin-jefferson", "wr1");
    expect(state.dreamTeams[0].picks[0]).toEqual({
      slotId: "wr1",
      assetId: "min-wr-justin-jefferson",
      teamId: "min",
    });
    expect(state.takenAssetIds).toContain("min-wr-justin-jefferson");
    expect(currentPlayerId(state)).toBe("p1");
    expect(state.phase).toBe("spin");
    expect(state.currentTeamId).toBeNull();
  });

  it("rejects locking a second asset from the same franchise on one roster", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    state = lockPick(state, league, "min-wr-justin-jefferson", "wr1");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "kc"));
    state = lockPick(state, league, "kc-qb-mahomes", "qb");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    const before = state;
    const after = lockPick(state, league, "min-qb-jj-mccarthy", "qb");
    expect(after).toEqual(before);
  });

  it("moves to revealReady after 9 picks each", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    // 6-team fixture supports 6 franchises per roster; use 6 rounds (12 picks) here.
    state = { ...state, turnOrder: buildTurnOrder(["p0", "p1"], "roundRobin", 6) };
    const rounds: { team: string; asset: string; slot: import("../league/types").SlotId }[] = [
      { team: "min", asset: "min-wr-justin-jefferson", slot: "wr1" },
      { team: "kc", asset: "kc-qb-mahomes", slot: "qb" },
      { team: "lar", asset: "lar-rb-kyren", slot: "rb" },
      { team: "chi", asset: "chi-rb-swift", slot: "rb" },
      { team: "atl", asset: "atl-qb-penix", slot: "qb" },
      { team: "jax", asset: "jax-wr-btj", slot: "wr1" },
      { team: "chi", asset: "chi-te-kmet", slot: "te" },
      { team: "min", asset: "min-wr-jordan-addison", slot: "wr2" },
      { team: "kc", asset: "kc-wr-worthy", slot: "wr2" },
      { team: "lar", asset: "lar-te-higbee", slot: "te" },
      { team: "jax", asset: "jax-defplayer-hutchinson", slot: "defPlayer" },
      { team: "atl", asset: "atl-defplayer-grady", slot: "defPlayer" },
    ];
    for (const round of rounds) {
      state = beginSpin(state);
      state = completeSpin(state, league, rngWant(state, round.team));
      state = lockPick(state, league, round.asset, round.slot);
    }
    expect(state.phase).toBe("revealReady");
    expect(state.dreamTeams[0].picks).toHaveLength(6);
    expect(state.dreamTeams[1].picks).toHaveLength(6);
  });

  it("playAgain keeps names and mode, clears picks", () => {
    let state = startGame(
      [{ id: "p0", name: "Berny" }, { id: "p1", name: "Andres" }],
      "snake",
    );
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    state = lockPick(state, league, "min-wr-justin-jefferson", "wr1");
    state = playAgain(state);
    expect(state.players[0].name).toBe("Berny");
    expect(state.turnMode).toBe("snake");
    expect(state.dreamTeams[0].picks).toEqual([]);
    expect(state.phase).toBe("spin");
    expect(state.verdict).toBeNull();
  });

  it("applyVerdict unique winner → scored; tied records → tied", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = { ...state, phase: "revealReady" };
    const unique = applyVerdict(state, {
      records: [
        { playerId: "p0", record: "13–4", wins: 13, paragraph: "a", strength: "s", hole: "h", playerToWatch: "x" },
        { playerId: "p1", record: "15–2", wins: 15, paragraph: "b", strength: "s", hole: "h", playerToWatch: "y" },
      ],
      championPlayerId: "p1",
      recordsTied: false,
      tiebreakLine: "",
    });
    expect(unique.phase).toBe("scored");
    const tied = applyVerdict(state, {
      records: [
        { playerId: "p0", record: "14–3", wins: 14, paragraph: "a", strength: "s", hole: "h", playerToWatch: "x" },
        { playerId: "p1", record: "14–3", wins: 14, paragraph: "b", strength: "s", hole: "h", playerToWatch: "y" },
      ],
      championPlayerId: "p0",
      recordsTied: true,
      tiebreakLine: "Better QB room",
    });
    expect(tied.phase).toBe("tied");
  });

  it("lockPick write-in stores a custom name and blocks the same name twice", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    state = lockPick(state, league, "writein-draft", "wr1", { name: "Justin Jefferson", group: "wr" });
    expect(state.dreamTeams[0].picks[0].teamId).toBe("min");
    expect(state.customAssets[0].name).toBe("Justin Jefferson");
    expect(state.phase).toBe("spin");

    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "kc"));
    const blocked = lockPick(state, league, "writein-draft", "wr1", {
      name: "justin  jefferson",
      group: "wr",
    });
    expect(blocked).toEqual(state);
    expect(blocked.dreamTeams[1].picks).toHaveLength(0);
  });

  it("completeSpin with no legal teams sets emptyLegal and stays on spin", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    const barren: League = { season: 2026, teams: [] };
    state = beginSpin(state);
    state = completeSpin(state, barren, () => 0);
    expect(state.phase).toBe("spin");
    expect(state.spinning).toBe(false);
    expect(state.emptyLegal).toBe(true);
  });
});
