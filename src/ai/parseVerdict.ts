import type { SlotVerdict, Verdict } from "./schema";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
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
