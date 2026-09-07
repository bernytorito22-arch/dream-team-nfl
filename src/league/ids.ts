import type { MenuGroup, SlotId } from "./types";

export const TEAM_IDS = [
  "ari", "atl", "bal", "buf", "car", "chi", "cin", "cle",
  "dal", "den", "det", "gb", "hou", "ind", "jax", "kc",
  "lv", "lac", "lar", "mia", "min", "ne", "no", "nyg",
  "nyj", "phi", "pit", "sea", "sf", "tb", "ten", "was",
] as const;

export const SLOT_DEFS: { id: SlotId; group: MenuGroup; label: string }[] = [
  { id: "qb", group: "qb", label: "QB" },
  { id: "rb", group: "rb", label: "RB" },
  { id: "wr1", group: "wr", label: "WR" },
  { id: "wr2", group: "wr", label: "WR" },
  { id: "te", group: "te", label: "TE" },
  { id: "defPlayer", group: "defPlayer", label: "DEF PLAYER" },
  { id: "def", group: "def", label: "DEF" },
  { id: "oline", group: "oline", label: "O-LINE" },
  { id: "coach", group: "coach", label: "COACH" },
];
