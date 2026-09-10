import { describe, expect, it } from "vitest";
import { REVEAL_SYSTEM, revealPrompt } from "./prompt";

const boards = revealPrompt([
  {
    playerId: "p0",
    name: "Berny",
    slots: [
      { slotId: "qb", assetName: "Josh Allen", teamName: "Buffalo Bills" },
      { slotId: "wr1", assetName: "Justin Jefferson", teamName: "Minnesota Vikings" },
      { slotId: "defPlayer", assetName: "Micah Parsons", teamName: "Green Bay Packers" },
      { slotId: "oline", assetName: "Eagles O-line", teamName: "Philadelphia Eagles" },
    ],
  },
]);

describe("revealPrompt", () => {
  it("labels the 9 roster slots instead of raw ids", () => {
    expect(boards).toContain("QB: Josh Allen (Buffalo Bills)");
    expect(boards).toContain("WR1: Justin Jefferson (Minnesota Vikings)");
    expect(boards).toContain("Def Player: Micah Parsons (Green Bay Packers)");
    expect(boards).toContain("O-line: Eagles O-line (Philadelphia Eagles)");
    expect(boards).not.toContain("defPlayer:");
  });
});

describe("REVEAL_SYSTEM", () => {
  it("forbids default holes and off-roster units", () => {
    expect(REVEAL_SYSTEM).toMatch(/2026 NFL/);
    expect(REVEAL_SYSTEM).toMatch(/Do not default to WR, QB, or linebackers/);
    expect(REVEAL_SYSTEM).toMatch(/no linebacker corps/);
    expect(REVEAL_SYSTEM).toMatch(/relative nit/);
    expect(REVEAL_SYSTEM).toMatch(/Do not cluster everyone at 11-12/);
  });
});
