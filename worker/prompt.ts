export function revealPrompt(dreamTeams: {
  playerId: string;
  name: string;
  slots: { slotId: string; assetName: string; teamName: string }[];
}[]): string {
  const boards = dreamTeams
    .map((dt) => {
      const lines = dt.slots.map((s) => `${s.slotId}: ${s.assetName} (${s.teamName})`).join("\n");
      return `${dt.name} [${dt.playerId}]\n${lines}`;
    })
    .join("\n\n");
  return [
    "You are a concise NFL studio desk. Ignore injuries and availability. Judge talent only.",
    "Roster names may be write-ins. Treat each name as the NFL player or unit they meant, even if a printed depth chart is stale.",
    "Each roster is a 9-slot dream team. Predict a 17-game record (wins 0-17).",
    "Winner is closest to 17-0 (most wins). If wins tie, still pick championPlayerId and write tiebreakLine.",
    "Return ONLY compact JSON, no markdown, no commentary. Keys: records (array), championPlayerId, tiebreakLine.",
    "Each record: playerId, wins (integer), paragraph (1-2 short sentences), strength (max 6 words), hole (max 6 words), playerToWatch (a name).",
    "Keep the whole response under 900 words.",
    "",
    boards,
  ].join("\n");
}
