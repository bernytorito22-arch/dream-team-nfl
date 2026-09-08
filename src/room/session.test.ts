import { describe, expect, it } from "vitest";
import fixtureJson from "../data/league.fixture.json";
import { currentPlayerId } from "../game/engine";
import type { League } from "../league/types";
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from "./codes";
import { ROOM_ERRORS } from "./protocol";
import {
  beginReveal,
  createRoom,
  finishReveal,
  joinGuest,
  kick,
  leaveLobby,
  pick,
  playAgainRoom,
  reconnect,
  spin,
  start,
} from "./session";

const league = fixtureJson as League;
const token = (n: number) => `token-${n}`;

function twoPlayerLobby() {
  const created = createRoom({
    code: "7K2M",
    hostName: "Host",
    turnMode: "roundRobin",
    token: token(0),
  });
  if (!created.ok) throw new Error("create failed");
  const joined = joinGuest(created.session, { name: "Guest", token: token(1) });
  if (!joined.ok) throw new Error("join failed");
  return joined.session;
}

describe("codes", () => {
  it("generates 4-char codes from safe charset", () => {
    const code = generateRoomCode(() => 0);
    expect(code).toHaveLength(4);
    expect(isValidRoomCode(code)).toBe(true);
  });

  it("normalizes join input", () => {
    expect(normalizeRoomCode(" 7k2m ")).toBe("7K2M");
  });
});

describe("room session", () => {
  it("creates room with host seat", () => {
    const r = createRoom({
      code: "ABCD",
      hostName: "Alex",
      turnMode: "snake",
      token: token(0),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.session.seats).toHaveLength(1);
      expect(r.session.seats[0].isHost).toBe(true);
      expect(r.session.phase).toBe("lobby");
    }
  });

  it("joins guest in lobby", () => {
    const lobby = twoPlayerLobby();
    expect(lobby.seats).toHaveLength(2);
  });

  it("rejects start from non-host and with one player", () => {
    const created = createRoom({
      code: "ABCD",
      hostName: "Host",
      turnMode: "roundRobin",
      token: token(0),
    });
    if (!created.ok) throw new Error("create failed");
    const alone = start(created.session, token(0));
    expect(alone.ok).toBe(false);

    const joined = joinGuest(created.session, { name: "G", token: token(1) });
    if (!joined.ok) throw new Error("join failed");
    const guestStart = start(joined.session, token(1));
    expect(guestStart.ok).toBe(false);
  });

  it("starts game with 2 players from host", () => {
    const lobby = twoPlayerLobby();
    const r = start(lobby, token(0));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.session.phase).toBe("play");
      expect(r.session.game?.players).toHaveLength(2);
    }
  });

  it("rejects 7th join and join after start", () => {
    let session = createRoom({
      code: "FULL",
      hostName: "H",
      turnMode: "roundRobin",
      token: token(0),
    }).session!;
    for (let i = 1; i <= 5; i++) {
      const j = joinGuest(session, { name: `P${i}`, token: token(i) });
      if (!j.ok) throw new Error("join failed");
      session = j.session;
    }
    expect(session.seats).toHaveLength(6);
    const seventh = joinGuest(session, { name: "Extra", token: token(99) });
    expect(seventh.ok).toBe(false);
    if (!seventh.ok) expect(seventh.error).toBe(ROOM_ERRORS.full);

    const started = start(session, token(0));
    if (!started.ok) throw new Error("start failed");
    const late = joinGuest(started.session, { name: "Late", token: token(100) });
    expect(late.ok).toBe(false);
    if (!late.ok) expect(late.error).toBe(ROOM_ERRORS.started);
  });

  it("host can kick guest in lobby only", () => {
    const lobby = twoPlayerLobby();
    const kicked = kick(lobby, token(0), "p1");
    expect(kicked.ok).toBe(true);
    if (kicked.ok) expect(kicked.session.seats).toHaveLength(1);

    const started = start(twoPlayerLobby(), token(0));
    if (!started.ok) throw new Error("start failed");
    const midKick = kick(started.session, token(0), "p1");
    expect(midKick.ok).toBe(false);
  });

  it("reconnect restores seat with good token", () => {
    const lobby = twoPlayerLobby();
    const r = reconnect(lobby, token(1));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.seat?.playerId).toBe("p1");

    const bad = reconnect(lobby, "nope");
    expect(bad.ok).toBe(false);
  });

  it("rejects spin and pick when not on the clock", () => {
    const started = start(twoPlayerLobby(), token(0));
    if (!started.ok) throw new Error("start failed");
    const spectatorSpin = spin(started.session, token(1), league, () => 0);
    expect(spectatorSpin.ok).toBe(true);
    if (spectatorSpin.ok) {
      expect(spectatorSpin.session.game?.phase).toBe("spin");
      expect(spectatorSpin.session.game?.currentTeamId).toBeNull();
    }
  });

  it("spin picks same team for frozen rng", () => {
    const started = start(twoPlayerLobby(), token(0));
    if (!started.ok) throw new Error("start failed");
    const rng = () => 0;
    const s1 = spin(started.session, token(0), league, rng);
    if (!s1.ok || !s1.session.game) throw new Error("spin failed");
    const team1 = s1.session.game.currentTeamId;

    const started2 = start(twoPlayerLobby(), token(0));
    if (!started2.ok) throw new Error("start failed");
    const s2 = spin(started2.session, token(0), league, rng);
    if (!s2.ok || !s2.session.game) throw new Error("spin failed");
    expect(s2.session.game.currentTeamId).toBe(team1);
  });

  it("on-clock pick advances turn", () => {
    let session = start(twoPlayerLobby(), token(0)).session!;
    session = spin(session, token(0), league, () => 0).session!;
    const game = session.game!;
    const pid = currentPlayerId(game);
    const dt = game.dreamTeams.find((d) => d.playerId === pid)!;
    const teamId = game.currentTeamId!;
    const team = league.teams.find((t) => t.id === teamId)!;
    const qb = team.assets.find((a) => a.group === "qb")!;
    const picked = pick(session, token(0), league, qb.id, "qb");
    expect(picked.ok).toBe(true);
    if (picked.ok && picked.session.game) {
      expect(picked.session.game.dreamTeams[0].picks).toHaveLength(1);
      expect(picked.session.game.phase).toBe("spin");
      expect(currentPlayerId(picked.session.game)).toBe("p1");
    }
  });

  it("beginReveal locks scoring and finishReveal applies verdict", () => {
    let session = start(twoPlayerLobby(), token(0)).session!;
    session = {
      ...session,
      game: {
        ...session.game!,
        phase: "revealReady",
      },
    };
    const begin = beginReveal(session, token(1));
    expect(begin.ok).toBe(true);
    if (begin.ok) expect(begin.session.scoring).toBe(true);

    const fail = finishReveal(begin.session!, null);
    expect(fail.ok).toBe(true);
    if (fail.ok) {
      expect(fail.session.scoring).toBe(false);
      expect(fail.session.game?.verdict).toBeNull();
    }

    const begin2 = beginReveal(fail.session!, token(0));
    const verdict = {
      records: [
        {
          playerId: "p0",
          record: "13-4",
          wins: 13,
          paragraph: "A",
          strength: "s",
          hole: "h",
          playerToWatch: "w",
        },
        {
          playerId: "p1",
          record: "15-2",
          wins: 15,
          paragraph: "B",
          strength: "s",
          hole: "h",
          playerToWatch: "w",
        },
      ],
      championPlayerId: "p1",
      recordsTied: false,
      tiebreakLine: "QB",
    };
    const done = finishReveal(begin2.session!, verdict);
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.session.game?.phase).toBe("scored");
      expect(done.session.game?.verdict?.championPlayerId).toBe("p1");
    }
  });

  it("host leave in lobby destroys room", () => {
    const lobby = twoPlayerLobby();
    const left = leaveLobby(lobby, token(0));
    expect(left.ok).toBe(true);
    if (left.ok) expect(left.session.destroyed).toBe(true);
  });

  it("host leave in play does not destroy", () => {
    const started = start(twoPlayerLobby(), token(0));
    if (!started.ok) throw new Error("start failed");
    const left = leaveLobby(started.session, token(0));
    expect(left.ok).toBe(true);
    if (left.ok) {
      expect(left.session.destroyed).toBe(false);
      expect(left.session.phase).toBe("play");
    }
  });

  it("play again requires host", () => {
    let session = start(twoPlayerLobby(), token(0)).session!;
    session = {
      ...session,
      game: { ...session.game!, phase: "scored", verdict: null },
    };
    const guest = playAgainRoom(session, token(1));
    expect(guest.ok).toBe(false);
    const host = playAgainRoom(session, token(0));
    expect(host.ok).toBe(true);
    if (host.ok) expect(host.session.game?.phase).toBe("spin");
  });
});
