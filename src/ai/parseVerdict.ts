import type { SlotVerdict, Verdict } from "./schema";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function extractModelText(result: unknown): string {
  if (!isRecord(result)) return "";
  if (typeof result.response === "string" && result.response.trim()) {
    return result.response;
  }
  const choices = result.choices;
  if (!Array.isArray(choices) || !isRecord(choices[0])) return "";
  const message = choices[0].message;
  if (!isRecord(message)) return "";
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    const joined = message.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (isRecord(part) && typeof part.text === "string") return part.text;
        return "";
      })
      .join("")
      .trim();
    if (joined) return joined;
  }
  if (typeof message.reasoning_content === "string") {
    return message.reasoning_content;
  }
  return "";
}

export function extractJson(text: string): unknown {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error(`no json in: ${text.slice(0, 200)}`);
  return JSON.parse(stripped.slice(start, end + 1));
}

export function parseVerdict(raw: unknown, playerIds: string[]): Verdict {
  if (!isRecord(raw) || !Array.isArray(raw.records)) throw new Error("invalid verdict");
  if (raw.records.length !== playerIds.length) throw new Error("record count");
  const seen = new Set<string>();
  const records: SlotVerdict[] = raw.records.map((row) => {
    if (!isRecord(row)) throw new Error("row");
    const playerId = String(row.playerId);
    if (!playerIds.includes(playerId) || seen.has(playerId)) throw new Error("player");
    seen.add(playerId);
    const wins = Number(row.wins);
    if (!Number.isInteger(wins) || wins < 0 || wins > 17) throw new Error("wins");
    const paragraph = String(row.paragraph ?? "");
    const strength = String(row.strength ?? "");
    const hole = String(row.hole ?? "");
    const playerToWatch = String(row.playerToWatch ?? "");
    if (!paragraph || !strength || !hole || !playerToWatch) throw new Error("copy");
    return {
      playerId,
      wins,
      record: `${wins}–${17 - wins}`,
      paragraph,
      strength,
      hole,
      playerToWatch,
    };
  });
  const championPlayerId = String(raw.championPlayerId ?? "");
  if (!playerIds.includes(championPlayerId)) throw new Error("champion");
  const maxWins = Math.max(...records.map((r) => r.wins));
  const recordsTied = records.filter((r) => r.wins === maxWins).length > 1;
  return {
    records,
    championPlayerId,
    recordsTied,
    tiebreakLine: String(raw.tiebreakLine ?? ""),
  };
}
