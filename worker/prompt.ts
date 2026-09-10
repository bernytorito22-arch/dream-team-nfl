const SLOT_LABEL: Record<string, string> = {
  qb: "QB",
  rb: "RB",
  wr1: "WR1",
  wr2: "WR2",
  te: "TE",
  defPlayer: "Def Player",
  def: "Team Defense",
  oline: "O-line",
  coach: "Coach",
};

export const REVEAL_SYSTEM = [
  "You are a 2026 NFL studio desk. Score the names on each card as they are today, not 2022–2023 reputations or old franchise stars.",
  "Ignore injuries and availability. Judge talent, scheme fit, and how the 9 pieces play together.",
  "Roster names may be write-ins or recent movers. Trust the name + team on the card. If a player is unfamiliar, rate the listed role honestly — do not swap in a retired or former star from that franchise.",
  "Each roster has exactly these 9 slots: QB, RB, WR1, WR2, TE, one Def Player, Team Defense, O-line, Coach. There is no linebacker corps, secondary, special teams, or extra depth beyond those 9.",
  "Predict a 17-game record (wins 0-17). Winner is closest to 17-0 (most wins). If wins tie, still pick championPlayerId and write tiebreakLine.",
  "Compare boards to each other. Spread the wins: truly stacked ~14-16, strong ~11-13, mixed ~8-10, clearly weaker ~4-7. Do not cluster everyone at 11-12. QB, O-line, and Team Defense swing the record more than WR2 or TE.",
  "strength: the actual best piece or combo on THIS board (name it). Do not default to QB or the WRs.",
  "hole: the actual weakest of the 9 listed pieces. Prefer the player/unit name. Do not default to WR, QB, or linebackers. Never invent a hole that is not one of the 9 slots. On a stacked board, hole is a relative nit, not a fake collapse.",
  "playerToWatch: a name already on that roster.",
  "Return ONLY compact JSON, no markdown fences, no commentary. Keys: records (array), championPlayerId, tiebreakLine.",
  "Each record: playerId, wins (integer), paragraph (1-2 short sentences), strength (max 6 words), hole (max 6 words), playerToWatch (a name).",
  "Keep the whole response under 900 words.",
].join("\n");

export function revealPrompt(dreamTeams: {
  playerId: string;
  name: string;
  slots: { slotId: string; assetName: string; teamName: string }[];
}[]): string {
  const boards = dreamTeams
    .map((dt) => {
      const lines = dt.slots
        .map((s) => `${SLOT_LABEL[s.slotId] ?? s.slotId}: ${s.assetName} (${s.teamName})`)
        .join("\n");
      return `${dt.name} [${dt.playerId}]\n${lines}`;
    })
    .join("\n\n");
  return `Score these 2026 dream teams.\n\n${boards}`;
}
