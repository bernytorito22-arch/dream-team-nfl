import { DurableObject } from "cloudflare:workers";
import leagueJson from "../src/data/league.json";
import { toRevealBody, SCORE_ERROR } from "../src/ai/client";
import type { GameState } from "../src/game/engine";
import type { League, TurnMode } from "../src/league/types";
import type { ClientMsg, RoomSession, Seat } from "../src/room/protocol";
import { findSeatByToken, ROOM_ERRORS, toPublicRoom } from "../src/room/protocol";
import {
  beginReveal,
  createRoom,
  finishReveal,
  joinGuest,
  kick,
  leaveLobby,
  leavePlay,
  pick,
  playAgainRoom,
  reconnect,
  spin,
  start,
} from "../src/room/session";
import type { Env } from "./index";
import { runReveal } from "./reveal";

const league = leagueJson as League;
const SESSION_KEY = "session";

type WsAttachment = { seatToken: string };

function serverRng(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 2 ** 32;
}

function newToken(): string {
  return crypto.randomUUID();
}

export class Room extends DurableObject<Env> {
  private session: RoomSession | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.session = (await ctx.storage.get<RoomSession>(SESSION_KEY)) ?? null;
    });
  }

  private async persist(session: RoomSession | null): Promise<void> {
    this.session = session;
    if (session) {
      await this.ctx.storage.put(SESSION_KEY, session);
    } else {
      await this.ctx.storage.delete(SESSION_KEY);
    }
  }

  async createHost(input: {
    code: string;
    hostName: string;
    turnMode: TurnMode;
  }): Promise<
    | { ok: true; playerId: string; seatToken: string }
    | { ok: false; occupied: true }
  > {
    if (this.session && !this.session.destroyed) {
      return { ok: false, occupied: true };
    }
    const token = newToken();
    const result = createRoom({
      code: input.code,
      hostName: input.hostName,
      turnMode: input.turnMode,
      token,
    });
    if (!result.ok || !result.seat) return { ok: false, occupied: true };
    await this.persist(result.session);
    return {
      ok: true,
      playerId: result.seat.playerId,
      seatToken: result.seat.seatToken,
    };
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    if (!this.session || this.session.destroyed) {
      return new Response(ROOM_ERRORS.notFound, { status: 404 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);

    const url = new URL(request.url);
    const tokenFromQuery = url.searchParams.get("token");
    if (tokenFromQuery && this.session) {
      const re = reconnect(this.session, tokenFromQuery);
      if (re.ok && re.seat) {
        server.serializeAttachment({ seatToken: tokenFromQuery } satisfies WsAttachment);
        this.sendSnapshot(server, re.session, re.seat);
      }
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private sendSnapshot(ws: WebSocket, session: RoomSession, you: Seat): void {
    ws.send(
      JSON.stringify({
        type: "snapshot",
        you,
        session: toPublicRoom(session),
      }),
    );
  }

  private sendError(ws: WebSocket, error: string): void {
    ws.send(JSON.stringify({ type: "error", error }));
  }

  private broadcast(session: RoomSession): void {
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as WsAttachment | null;
      if (!attachment?.seatToken) continue;
      const seat = findSeatByToken(session, attachment.seatToken);
      if (!seat) continue;
      this.sendSnapshot(ws, session, seat);
    }
  }

  private seatToken(ws: WebSocket): string | null {
    const attachment = ws.deserializeAttachment() as WsAttachment | null;
    return attachment?.seatToken ?? null;
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (!this.session || this.session.destroyed) {
      this.sendError(ws, ROOM_ERRORS.notFound);
      return;
    }
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(message)) as ClientMsg;
    } catch {
      return;
    }

    if (msg.type === "hello") {
      await this.handleHello(ws, msg);
      return;
    }

    const seatToken = this.seatToken(ws);
    if (!seatToken) return;

    await this.handleAction(ws, seatToken, msg);
  }

  private async handleHello(
    ws: WebSocket,
    msg: Extract<ClientMsg, { type: "hello" }>,
  ): Promise<void> {
    if (!this.session || this.session.destroyed) {
      this.sendError(ws, ROOM_ERRORS.notFound);
      return;
    }

    if ("seatToken" in msg && msg.seatToken) {
      const result = reconnect(this.session, msg.seatToken);
      if (!result.ok || !result.seat) {
        this.sendError(ws, result.ok ? ROOM_ERRORS.notFound : result.error);
        return;
      }
      ws.serializeAttachment({ seatToken: msg.seatToken } satisfies WsAttachment);
      this.sendSnapshot(ws, result.session, result.seat);
      await this.persist(result.session);
      return;
    }

    if ("name" in msg && msg.name !== undefined) {
      const token = newToken();
      const result = joinGuest(this.session, { name: msg.name, token });
      if (!result.ok || !result.seat) {
        this.sendError(ws, result.ok ? ROOM_ERRORS.full : result.error);
        return;
      }
      ws.serializeAttachment({ seatToken: token } satisfies WsAttachment);
      await this.persist(result.session);
      this.broadcast(result.session);
      return;
    }
  }

  private async handleAction(
    ws: WebSocket,
    seatToken: string,
    msg: Exclude<ClientMsg, { type: "hello" }>,
  ): Promise<void> {
    if (!this.session) return;
    let session = this.session;
    let result;

    switch (msg.type) {
      case "start":
        result = start(session, seatToken);
        break;
      case "kick":
        result = kick(session, seatToken, msg.playerId);
        break;
      case "spin":
        result = spin(session, seatToken, league, serverRng);
        break;
      case "pick":
        result = pick(session, seatToken, league, msg.assetId, msg.slotId, msg.writeIn);
        break;
      case "reveal":
        result = beginReveal(session, seatToken);
        if (result.ok && result.session.scoring && result.session.game) {
          await this.persist(result.session);
          this.broadcast(result.session);
          await this.runRoomReveal(result.session, seatToken);
          return;
        }
        break;
      case "playAgain":
        result = playAgainRoom(session, seatToken);
        break;
      case "leave":
        result =
          session.phase === "lobby"
            ? leaveLobby(session, seatToken)
            : leavePlay(session, seatToken);
        break;
      default:
        return;
    }

    if (!result) return;
    if (!result.ok) {
      this.sendError(ws, result.error);
      return;
    }

    await this.persist(result.session);
    if (result.session.destroyed) {
      this.broadcast(result.session);
      for (const sock of this.ctx.getWebSockets()) {
        if (sock !== ws) this.sendError(sock, ROOM_ERRORS.hostLeft);
      }
      return;
    }
    this.broadcast(result.session);
  }

  private async runRoomReveal(session: RoomSession, _seatToken: string): Promise<void> {
    if (!session.game) return;
    const body = toRevealBody(
      session.game.dreamTeams,
      league,
      session.game.customAssets ?? [],
    );
    const revealResult = await runReveal(this.env, body.dreamTeams);
    const finish = finishReveal(
      session,
      revealResult.ok ? revealResult.verdict : null,
    );
    if (!finish.ok) return;
    await this.persist(finish.session);
    this.broadcast(finish.session);
    if (!revealResult.ok) {
      for (const sock of this.ctx.getWebSockets()) {
        this.sendError(sock, SCORE_ERROR);
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const seatToken = this.seatToken(ws);
    if (!seatToken || !this.session) return;

    if (this.session.phase === "lobby") {
      const result = leaveLobby(this.session, seatToken);
      if (!result.ok) return;
      await this.persist(result.session.destroyed ? null : result.session);
      if (result.session.destroyed) {
        for (const sock of this.ctx.getWebSockets()) {
          if (sock !== ws) this.sendError(sock, ROOM_ERRORS.hostLeft);
        }
      } else {
        this.broadcast(result.session);
      }
    }
  }
}
