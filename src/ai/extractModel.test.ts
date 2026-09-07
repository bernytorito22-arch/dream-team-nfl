import { describe, expect, it } from "vitest";
import { extractJson, modelText } from "./extractModel";

const verdict = {
  records: [{ playerId: "p0", wins: 13 }],
  championPlayerId: "p0",
};

describe("extractJson", () => {
  it("parses the records object even when thinking text contains braces", () => {
    const raw = `scratch { "note": 1 } then answer\n${JSON.stringify(verdict)}`;
    expect(extractJson(raw)).toEqual(verdict);
  });

  it("parses fenced json", () => {
    expect(extractJson("```json\n" + JSON.stringify(verdict) + "\n```")).toEqual(verdict);
  });
});

describe("modelText", () => {
  it("reads OpenAI-style choices content", () => {
    expect(modelText({ choices: [{ message: { content: JSON.stringify(verdict) } }] })).toBe(
      JSON.stringify(verdict),
    );
  });

  it("joins content parts", () => {
    expect(modelText({ choices: [{ message: { content: [{ text: "{" }, { text: "}" }] } }] })).toBe("{}");
  });
});
