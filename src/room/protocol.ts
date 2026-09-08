import type { GameState, WriteInDraft } from "../game/engine";
import type { SlotId, TurnMode } from "../league/types";

export const ROOM_ERRORS = {
  notFound: "Room not found",
  started: "Game already started",
  full: "Room is full",
  hostLeft: "Host left",
} as const;

export type RoomError = (typeof ROOM_ERRORS)[keyof typeof ROOM_ERRORS];

export type Seat = {
  playerId: string;
  name: string;
  seatToken: string;
  isHost: boolean;
};

export type PublicSeat = {
  playerId: string;
  name: string;
  isHost: boolean;
};

export type RoomSession = {
  code: string;
  phase: "lobby" | "play";
  turnMode: TurnMode;
  seats: Seat[];
  hostPlayerId: string;
  game: GameState | null;
  scoring: boolean;
  destroyed: boolean;
};

export type PublicRoom = {
  code: string;
  phase: "lobby" | "play";
  turnMode: TurnMode;
  seats: PublicSeat[];
  hostPlayerId: string;
  game: GameState | null;
  scoring: boolean;
  destroyed: boolean;
};

export type ClientMsg =
  | { type: "hello"; name: string }
  | { type: "hello"; seatToken: string }
  | { type: "start" }
  | { type: "kick"; playerId: string }
  | { type: "spin" }
  | { type: "pick"; assetId: string; slotId: SlotId; writeIn?: WriteInDraft }
  | { type: "reveal" }
  | { type: "playAgain" }
  | { type: "leave" };

export type ServerMsg =
  | { type: "snapshot"; you: Seat; session: PublicRoom }
  | { type: "error"; error: string };

export type CreateRoomResponse = {
  code: string;
  playerId: string;
  seatToken: string;
};

export function toPublicRoom(session: RoomSession): PublicRoom {
  return {
    code: session.code,
    phase: session.phase,
    turnMode: session.turnMode,
    seats: session.seats.map(({ playerId, name, isHost }) => ({
      playerId,
      name,
      isHost,
    })),
    hostPlayerId: session.hostPlayerId,
    game: session.game,
    scoring: session.scoring,
    destroyed: session.destroyed,
  };
}

export function findSeatByToken(session: RoomSession, seatToken: string): Seat | undefined {
  return session.seats.find((s) => s.seatToken === seatToken);
}

export function isHost(session: RoomSession, seatToken: string): boolean {
  const seat = findSeatByToken(session, seatToken);
  return seat?.isHost ?? false;
}
