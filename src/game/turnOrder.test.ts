import { describe, expect, it } from "vitest";
import { buildTurnOrder } from "./turnOrder";

describe("buildTurnOrder", () => {
  it("round robin 3 players × 9 picks", () => {
    const order = buildTurnOrder(["p0", "p1", "p2"], "roundRobin", 9);
    expect(order).toHaveLength(27);
    expect(order.slice(0, 6)).toEqual(["p0", "p1", "p2", "p0", "p1", "p2"]);
    expect(order[26]).toBe("p2");
  });

  it("snake 3 players × 9 picks doubles the last player at the turn", () => {
    const order = buildTurnOrder(["p0", "p1", "p2"], "snake", 9);
    expect(order).toHaveLength(27);
    expect(order.slice(0, 9)).toEqual([
      "p0", "p1", "p2",
      "p2", "p1", "p0",
      "p0", "p1", "p2",
    ]);
  });

  it("snake 2 players alternates pairs", () => {
    expect(buildTurnOrder(["p0", "p1"], "snake", 4)).toEqual([
      "p0", "p1", "p1", "p0", "p0", "p1", "p1", "p0",
    ]);
  });

  it("round robin 6 players × 9 picks", () => {
    const ids = ["p0", "p1", "p2", "p3", "p4", "p5"];
    const order = buildTurnOrder(ids, "roundRobin", 9);
    expect(order).toHaveLength(54);
    expect(order.slice(0, 6)).toEqual(ids);
    expect(order.slice(6, 12)).toEqual(ids);
  });
});
