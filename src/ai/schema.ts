export type SlotVerdict = {
  playerId: string;
  record: string;
  wins: number;
  paragraph: string;
  strength: string;
  hole: string;
  playerToWatch: string;
};

export type Verdict = {
  records: SlotVerdict[];
  championPlayerId: string;
  recordsTied: boolean;
  tiebreakLine: string;
};
