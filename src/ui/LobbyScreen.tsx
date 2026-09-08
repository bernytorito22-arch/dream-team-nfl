import type { PublicRoom, Seat } from "../room/protocol";
import { NflMark } from "./NflMark";

export function LobbyScreen(props: {
  you: Seat;
  session: PublicRoom;
  onStart: () => void;
  onKick: (playerId: string) => void;
  onHome: () => void;
  error: string | null;
}) {
  const { session, you } = props;
  const count = session.seats.length;
  const canStart = you.isHost && count >= 2 && count <= 6;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/r/${session.code}`
      : `/r/${session.code}`;

  return (
    <main className="shell setup bg-photo bg-stadium">
      <header className="brand-corner">
        <NflMark size={44} />
        <span className="brand-word display">
          Dream
          <br />
          Team
        </span>
      </header>

      <div className="setup-card lobby-card">
        <p className="lobby-label display">Room code</p>
        <p className="lobby-code display" aria-live="polite">
          {session.code}
        </p>
        <p className="lobby-link">
          <span className="muted">Share:</span> {shareUrl}
        </p>

        <section className="setup-panel lobby-panel">
          <span className="panel-tab display">Lobby</span>
          <ul className="lobby-list">
            {session.seats.map((seat) => (
              <li key={seat.playerId} className="lobby-row">
                <span className="display">
                  {seat.name}
                  {seat.isHost ? " · host" : ""}
                </span>
                {you.isHost && !seat.isHost ? (
                  <button
                    type="button"
                    className="lobby-kick"
                    onClick={() => props.onKick(seat.playerId)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="lobby-count">
            {count} / 6 players · need at least 2 to start
          </p>
        </section>

        {props.error ? <p className="notice">{props.error}</p> : null}

        {you.isHost ? (
          <button
            type="button"
            className="start-btn display"
            disabled={!canStart}
            onClick={props.onStart}
          >
            Start game
          </button>
        ) : (
          <p className="lobby-wait display">Waiting for host to start…</p>
        )}

        <button type="button" className="ghost-btn display lobby-home" onClick={props.onHome}>
          Home
        </button>
      </div>
    </main>
  );
}
