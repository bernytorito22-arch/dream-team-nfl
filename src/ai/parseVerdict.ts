import type { SlotVerdict, Verdict } from "./schema";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function resolvePlayerId(raw: string, playerIds: string[], displayNames: string[]): string | null {
  const token = raw.trim();
  if (playerIds.includes(token)) return token;
  const lower = token.toLowerCase();
  const nameHits = playerIds.filter((_, i) => (displayNames[i] ?? "").trim().toLowerCase() === lower);
  if (nameHits.length === 1) return nameHits[0];
  return null;
}

function parseWins(row: Record<string, unknown>): number {
  const direct = Number(row.wins);
  if (Number.isInteger(direct) && direct >= 0 && direct <= 17) return direct;
  const rec = String(row.record ?? "");
  const m = rec.match(/^(\d+)\s*[–-]\s*(\d+)/);
  if (m) {
    const wins = Number(m[1]);
    if (Number.isInteger(wins) && wins >= 0 && wins <= 17) return wins;
  }
  throw new Error("wins");
}

export function parseVerdict(
  raw: unknown,
  playerIds: string[],
  displayNames: string[] = [],
): Verdict {
  if (!isRecord(raw) || !Array.isArray(raw.records)) throw new Error("invalid verdict");
  if (raw.records.length !== playerIds.length) throw new Error("record count");
  const seen = new Set<string>();
  const records: SlotVerdict[] = raw.records.map((row) => {
    if (!isRecord(row)) throw new Error("row");
    const playerId = resolvePlayerId(String(row.playerId ?? ""), playerIds, displayNames);
    if (!playerId || seen.has(playerId)) throw new Error("player");
    seen.add(playerId);
    const wins = parseWins(row);
    const paragraph = String(row.paragraph ?? "").trim();
    const strength = String(row.strength ?? "").trim();
    const hole = String(row.hole ?? "").trim();
    const playerToWatch = String(row.playerToWatch ?? "").trim();
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
  const championPlayerId = resolvePlayerId(
    String(raw.championPlayerId ?? ""),
    playerIds,
    displayNames,
  );
  if (!championPlayerId) throw new Error("champion");
  const maxWins = Math.max(...records.map((r) => r.wins));
  const recordsTied = records.filter((r) => r.wins === maxWins).length > 1;
  return {
    records,
    championPlayerId,
    recordsTied,
    tiebreakLine: String(raw.tiebreakLine ?? ""),
  };
}
