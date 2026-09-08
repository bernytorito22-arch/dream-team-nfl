import { describe, expect, it } from "vitest";
import { extractJson, extractModelText, parseVerdict } from "./parseVerdict";

const players = ["p0", "p1"];

const good = {
  records: [
    { playerId: "p0", wins: 13, paragraph: "Why A", strength: "WRs", hole: "QB", playerToWatch: "Bijan" },
    { playerId: "p1", wins: 15, paragraph: "Why B", strength: "QB", hole: "WR1", playerToWatch: "Mahomes" },
  ],
  championPlayerId: "p1",
  tiebreakLine: "QB gap",
};

describe("parseVerdict", () => {
  it("accepts valid unique-winner payload", () => {
    const v = parseVerdict(good, players);
    expect(v.records[0].record).toBe("13–4");
    expect(v.recordsTied).toBe(false);
    expect(v.championPlayerId).toBe("p1");
  });

  it("flags tied wins even if champion is set", () => {
    const tied = {
      records: [
        { playerId: "p0", wins: 14, paragraph: "a", strength: "s", hole: "h", playerToWatch: "x" },
        { playerId: "p1", wins: 14, paragraph: "b", strength: "s", hole: "h", playerToWatch: "y" },
      ],
      championPlayerId: "p0",
      tiebreakLine: "Better QB",
    };
    expect(parseVerdict(tied, players).recordsTied).toBe(true);
  });

  it("throws on garbage, missing player, wins out of range, unknown champion", () => {
    expect(() => parseVerdict("nope", players)).toThrow();
    expect(() => parseVerdict({ ...good, records: [good.records[0]] }, players)).toThrow();
    expect(() => parseVerdict({
      ...good,
      records: [{ ...good.records[0], wins: 18 }, good.records[1]],
    }, players)).toThrow();
    expect(() => parseVerdict({ ...good, championPlayerId: "p9" }, players)).toThrow();
  });
});

describe("extractJson", () => {
  it("parses JSON wrapped in markdown fences", () => {
    const wrapped = "```json\n" + JSON.stringify(good) + "\n```";
    expect(extractJson(wrapped)).toEqual(good);
  });
});

describe("extractModelText", () => {
  it("reads OpenAI-style choices when response is missing", () => {
    expect(
      extractModelText({
        choices: [{ message: { content: JSON.stringify(good) } }],
      }),
    ).toBe(JSON.stringify(good));
  });
});
