import type { Verdict } from "../ai/schema";
import {
  applyVerdict,
  beginSpin,
  completeSpin,
  currentPlayerId,
  lockPick,
  playAgain,
  startGame,
  type GameState,
  type WriteInDraft,
} from "../game/engine";
import type { League, SlotId, TurnMode } from "../league/types";
import {
  findSeatByToken,
  isHost,
  ROOM_ERRORS,
  type RoomSession,
  type Seat,
} from "./protocol";

export type SessionResult =
  | { ok: true; session: RoomSession; seat?: Seat }
  | { ok: false; error: string };

function ok(session: RoomSession, seat?: Seat): SessionResult {
  return { ok: true, session, seat };
}

function fail(error: string): SessionResult {
  return { ok: false, error };
}

function nextPlayerId(seats: Seat[]): string {
  return `p${seats.length}`;
}

export function createRoom(input: {
  code: string;
  hostName: string;
  turnMode: TurnMode;
  token: string;
}): SessionResult {
  const name = input.hostName.trim() || "Player 1";
  const host: Seat = {
    playerId: "p0",
    name,
    seatToken: input.token,
    isHost: true,
  };
  return ok({
    code: input.code,
    phase: "lobby",
    turnMode: input.turnMode,
    seats: [host],
    hostPlayerId: "p0",
    game: null,
    scoring: false,
    destroyed: false,
  }, host);
}

export function joinGuest(
  session: RoomSession,
  input: { name: string; token: string },
): SessionResult {
  if (session.destroyed) return fail(ROOM_ERRORS.notFound);
  if (session.phase !== "lobby") return fail(ROOM_ERRORS.started);
  if (session.seats.length >= 6) return fail(ROOM_ERRORS.full);
  const seat: Seat = {
    playerId: nextPlayerId(session.seats),
    name: input.name.trim() || `Player ${session.seats.length + 1}`,
    seatToken: input.token,
    isHost: false,
  };
  return ok({ ...session, seats: [...session.seats, seat] }, seat);
}

export function reconnect(session: RoomSession, seatToken: string): SessionResult {
  if (session.destroyed) return fail(ROOM_ERRORS.notFound);
  const seat = findSeatByToken(session, seatToken);
  if (!seat) return fail(ROOM_ERRORS.notFound);
  return ok(session, seat);
}

export function kick(
  session: RoomSession,
  hostToken: string,
  playerId: string,
): SessionResult {
  if (session.destroyed) return fail(ROOM_ERRORS.notFound);
  if (session.phase !== "lobby") return fail(ROOM_ERRORS.started);
  if (!isHost(session, hostToken)) return fail(ROOM_ERRORS.notFound);
  if (playerId === session.hostPlayerId) return fail(ROOM_ERRORS.notFound);
  const next = session.seats.filter((s) => s.playerId !== playerId);
  if (next.length === session.seats.length) return fail(ROOM_ERRORS.notFound);
  return ok({ ...session, seats: next });
}

export function start(session: RoomSession, hostToken: string): SessionResult {
  if (session.destroyed) return fail(ROOM_ERRORS.notFound);
  if (session.phase !== "lobby") return fail(ROOM_ERRORS.started);
  if (!isHost(session, hostToken)) return fail(ROOM_ERRORS.notFound);
  if (session.seats.length < 2 || session.seats.length > 6) {
    return fail(ROOM_ERRORS.notFound);
  }
  const players = session.seats.map((s) => ({ id: s.playerId, name: s.name }));
  const game = startGame(players, session.turnMode);
  return ok({ ...session, phase: "play", game, scoring: false });
}

export function spin(
  session: RoomSession,
  seatToken: string,
  league: League,
  rng: () => number,
): SessionResult {
  if (session.destroyed || session.phase !== "play" || !session.game) {
    return fail(ROOM_ERRORS.notFound);
  }
  const seat = findSeatByToken(session, seatToken);
  if (!seat) return fail(ROOM_ERRORS.notFound);
  if (currentPlayerId(session.game) !== seat.playerId) {
    return ok(session);
  }
  if (session.game.phase !== "spin" || session.game.spinning) {
    return ok(session);
  }
  let game = beginSpin(session.game);
  game = completeSpin(game, league, rng);
  return ok({ ...session, game });
}

export function pick(
  session: RoomSession,
  seatToken: string,
  league: League,
  assetId: string,
  slotId: SlotId,
  writeIn?: WriteInDraft,
): SessionResult {
  if (session.destroyed || session.phase !== "play" || !session.game) {
    return fail(ROOM_ERRORS.notFound);
  }
  const seat = findSeatByToken(session, seatToken);
  if (!seat) return fail(ROOM_ERRORS.notFound);
  if (currentPlayerId(session.game) !== seat.playerId) {
    return ok(session);
  }
  const game = lockPick(session.game, league, assetId, slotId, writeIn);
  if (game === session.game) return ok(session);
  return ok({ ...session, game });
}

export function beginReveal(session: RoomSession, seatToken: string): SessionResult {
  if (session.destroyed || session.phase !== "play" || !session.game) {
    return fail(ROOM_ERRORS.notFound);
  }
  if (!findSeatByToken(session, seatToken)) return fail(ROOM_ERRORS.notFound);
  const phase = session.game.phase;
  if (phase !== "revealReady" && phase !== "tied" && phase !== "scored") {
    return ok(session);
  }
  if (session.scoring) return ok(session);
  return ok({ ...session, scoring: true });
}

export function finishReveal(
  session: RoomSession,
  verdict: Verdict | null,
): SessionResult {
  if (session.destroyed || session.phase !== "play" || !session.game) {
    return fail(ROOM_ERRORS.notFound);
  }
  if (!session.scoring) return ok(session);
  if (!verdict) {
    return ok({ ...session, scoring: false });
  }
  const game = applyVerdict(session.game, verdict);
  return ok({ ...session, game, scoring: false });
}

export function playAgainRoom(session: RoomSession, hostToken: string): SessionResult {
  if (session.destroyed || session.phase !== "play" || !session.game) {
    return fail(ROOM_ERRORS.notFound);
  }
  if (!isHost(session, hostToken)) return fail(ROOM_ERRORS.notFound);
  const game = playAgain(session.game);
  return ok({ ...session, game, scoring: false });
}

export function leaveLobby(session: RoomSession, seatToken: string): SessionResult {
  if (session.destroyed) return fail(ROOM_ERRORS.notFound);
  if (session.phase !== "lobby") return ok(session);
  const seat = findSeatByToken(session, seatToken);
  if (!seat) return fail(ROOM_ERRORS.notFound);
  if (seat.isHost) {
    return ok({ ...session, destroyed: true, seats: [] });
  }
  return ok({
    ...session,
    seats: session.seats.filter((s) => s.seatToken !== seatToken),
  });
}

/** Play-phase leave keeps the seat for reconnect; only disconnect at DO layer. */
export function leavePlay(session: RoomSession, seatToken: string): SessionResult {
  if (session.destroyed) return fail(ROOM_ERRORS.notFound);
  if (!findSeatByToken(session, seatToken)) return fail(ROOM_ERRORS.notFound);
  return ok(session);
}
