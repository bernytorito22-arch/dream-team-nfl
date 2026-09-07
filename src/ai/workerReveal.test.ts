import { describe, expect, it } from "vitest";
import { handleReveal } from "../../worker/index";
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
  it("disables GLM thinking and asks for JSON", async () => {
    let input: Record<string, unknown> | undefined;
    const env = {
      AI: {
        run: async (_model: string, body: Record<string, unknown>) => {
          input = body;
          return { response: modelJson };
        },
      },
    };
    await handleReveal(
      new Request("https://x/api/reveal", { method: "POST", body: JSON.stringify(body) }),
      env as never,
    );
    expect(input?.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(input?.response_format).toEqual({ type: "json_object" });
  });

  it("retries without json_object if the model rejects the format", async () => {
    let calls = 0;
    const env = {
      AI: {
        run: async (_model: string, input: Record<string, unknown>) => {
          calls += 1;
          if (input.response_format) throw new Error("unsupported");
          return { response: modelJson };
        },
      },
    };
    const res = await handleReveal(
      new Request("https://x/api/reveal", { method: "POST", body: JSON.stringify(body) }),
      env as never,
    );
    expect(calls).toBe(2);
    expect((await res.json()).ok).toBe(true);
  });

  it("accepts OpenAI-style choices and name-keyed records", async () => {
    const named = JSON.stringify({
      records: [
        { playerId: "Berny", wins: 13, paragraph: "Why A", strength: "WRs", hole: "QB", playerToWatch: "Bijan" },
        { playerId: "Andres", wins: 15, paragraph: "Why B", strength: "QB", hole: "WR1", playerToWatch: "Mahomes" },
      ],
      championPlayerId: "Andres",
      tiebreakLine: "QB",
    });
    const env = {
      AI: { run: async () => ({ choices: [{ message: { content: named } }] }) },
    };
    const res = await handleReveal(
      new Request("https://x/api/reveal", { method: "POST", body: JSON.stringify(body) }),
      env as never,
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.verdict.championPlayerId).toBe("p1");
  });

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
