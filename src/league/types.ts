export type SlotId =
  | "qb"
  | "rb"
  | "wr1"
  | "wr2"
  | "te"
  | "defPlayer"
  | "def"
  | "oline"
  | "coach";

export type MenuGroup =
  | "qb"
  | "rb"
  | "wr"
  | "te"
  | "defPlayer"
  | "def"
  | "oline"
  | "coach";

export type AssetKind = "player" | "unit";

export type TurnMode = "roundRobin" | "snake";

export type PlayerSetup = {
  id: string;
  name: string;
};

export type LeagueAsset = {
  id: string;
  name: string;
  kind: AssetKind;
  group: MenuGroup;
  teamId: string;
};

export type LeagueTeam = {
  id: string;
  abbr: string;
  name: string;
  city: string;
  assets: LeagueAsset[];
};

export type League = {
  season: 2026;
  teams: LeagueTeam[];
};

export type Pick = {
  slotId: SlotId;
  assetId: string;
  teamId: string;
};

export type DreamTeam = {
  playerId: string;
  name: string;
  picks: Pick[];
};
