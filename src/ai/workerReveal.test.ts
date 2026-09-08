import { describe, expect, it } from "vitest";
import { handleReveal } from "../../worker/revealHttp";
import { SCORE_ERROR } from "./client";

const body = {
  dreamTeams: [
    {
      playerId: "p0",
      name: "Berny",
      slots: [{ slotId: "qb", assetName: "Malik Willis", teamName: "Tennessee Titans" }],
    },
    {
      playerId: "p1",
      name: "Andres",
      slots: [{ slotId: "qb", assetName: "Patrick Mahomes", teamName: "Kansas City Chiefs" }],
    },
  ],
};

const modelJson = JSON.stringify({
  records: [
    { playerId: "p0", wins: 13, paragraph: "Why A", strength: "WRs", hole: "QB", playerToWatch: "Bijan" },
    { playerId: "p1", wins: 15, paragraph: "Why B", strength: "QB", hole: "WR1", playerToWatch: "Mahomes" },
  ],
  championPlayerId: "p1",
  tiebreakLine: "QB",
});

describe("handleReveal", () => {
  it("returns ok verdict from model JSON", async () => {
    const env = {
      AI: { run: async () => ({ response: modelJson }) },
    };
    const res = await handleReveal(
      new Request("https://x/api/reveal", { method: "POST", body: JSON.stringify(body) }),
      env,
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.verdict.championPlayerId).toBe("p1");
  });

  it("returns SCORE_ERROR on garbage model output", async () => {
    const env = { AI: { run: async () => ({ response: "not json" }) } };
    const res = await handleReveal(
      new Request("https://x/api/reveal", { method: "POST", body: JSON.stringify(body) }),
      env,
    );
    const json = await res.json();
    expect(res.status).toBe(502);
    expect(json).toEqual({ ok: false, error: SCORE_ERROR });
  });

  it("returns SCORE_ERROR when AI throws", async () => {
    const env = { AI: { run: async () => { throw new Error("timeout"); } } };
    const res = await handleReveal(
      new Request("https://x/api/reveal", { method: "POST", body: JSON.stringify(body) }),
      env,
    );
    expect((await res.json()).ok).toBe(false);
  });
});
