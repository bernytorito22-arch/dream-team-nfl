import type { TurnMode } from "../league/types";
import type { ClientMsg, CreateRoomResponse, PublicRoom, Seat, ServerMsg } from "../room/protocol";

export type RoomSnapshot = {
  you: Seat;
  session: PublicRoom;
};

export async function createRoomApi(
  name: string,
  turnMode: TurnMode,
): Promise<CreateRoomResponse> {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, turnMode }),
  });
  if (!res.ok) {
    throw new Error("Could not create room");
  }
  return (await res.json()) as CreateRoomResponse;
}

function wsUrl(code: string, token?: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const base = `${proto}//${window.location.host}/api/room/${code.toUpperCase()}/ws`;
  if (token) return `${base}?token=${encodeURIComponent(token)}`;
  return base;
}

export type RoomSocket = {
  send: (msg: ClientMsg) => void;
  close: () => void;
};

export function openRoomSocket(
  code: string,
  handlers: {
    onSnapshot: (snap: RoomSnapshot) => void;
    onError: (error: string) => void;
    onClose: (code: number) => void;
    onOpen?: () => void;
  },
  opts?: { token?: string; guestName?: string },
): RoomSocket {
  const socket = new WebSocket(wsUrl(code, opts?.token));
  let open = false;

  socket.addEventListener("open", () => {
    open = true;
    handlers.onOpen?.();
    if (opts?.token) {
      socket.send(JSON.stringify({ type: "hello", seatToken: opts.token } satisfies ClientMsg));
    } else if (opts?.guestName) {
      socket.send(JSON.stringify({ type: "hello", name: opts.guestName } satisfies ClientMsg));
    }
  });

  socket.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(String(event.data)) as ServerMsg;
      if (msg.type === "snapshot") {
        handlers.onSnapshot({ you: msg.you, session: msg.session });
      } else if (msg.type === "error") {
        handlers.onError(msg.error);
      }
    } catch {
      /* ignore malformed */
    }
  });

  socket.addEventListener("close", (event) => {
    handlers.onClose(event.code);
  });

  return {
    send(msg: ClientMsg) {
      if (open && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
      }
    },
    close() {
      socket.close();
    },
  };
}

export function joinRoomHello(socket: RoomSocket, name: string): void {
  socket.send({ type: "hello", name });
}

// joinRoomHello kept for callers that send hello after open; prefer guestName in openRoomSocket opts.
