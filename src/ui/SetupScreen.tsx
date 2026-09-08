import { useState } from "react";
import type { TurnMode } from "../league/types";
import { createSetupDefaults } from "../game/engine";
import { normalizeRoomCode } from "../room/codes";
import { NflMark } from "./NflMark";

type SetupTab = "local" | "room";
type RoomTab = "create" | "join";

export function SetupScreen(props: {
  notice: "none" | "corrupt";
  initialJoinCode?: string;
  roomError?: string | null;
  onStartLocal: (names: { id: string; name: string }[], turnMode: TurnMode) => void;
  onCreateRoom: (hostName: string, turnMode: TurnMode) => void;
  onJoinRoom: (code: string, name: string) => void;
}) {
  const [tab, setTab] = useState<SetupTab>(props.initialJoinCode ? "room" : "local");
  const [roomTab, setRoomTab] = useState<RoomTab>(props.initialJoinCode ? "join" : "create");
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(() => createSetupDefaults(4).map((p) => p.name));
  const [turnMode, setTurnMode] = useState<TurnMode>("roundRobin");
  const [hostName, setHostName] = useState("");
  const [joinCode, setJoinCode] = useState(props.initialJoinCode ?? "");
  const [joinName, setJoinName] = useState("");
  const [busy, setBusy] = useState(false);

  function setCountSafe(n: number) {
    const next = Math.min(6, Math.max(2, n));
    setCount(next);
    setNames((prev) => createSetupDefaults(next).map((p, i) => prev[i] ?? p.name));
  }

  const modeBox = (
    <div className="mode-box">
      <button
        type="button"
        className={`mode-option ${turnMode === "roundRobin" ? "active" : ""}`}
        onClick={() => setTurnMode("roundRobin")}
      >
        <span className="display">Round robin</span>
        <span className="mode-switch" aria-hidden="true">
          <span className="knob" />
        </span>
      </button>
      <button
        type="button"
        className={`mode-option ${turnMode === "snake" ? "active" : ""}`}
        onClick={() => setTurnMode("snake")}
      >
        <span className="display">Snake</span>
        <span className="mode-circle" aria-hidden="true" />
      </button>
    </div>
  );

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

      <div className="setup-card">
        <div className="setup-tabs" role="tablist" aria-label="Play mode">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "local"}
            className={`setup-tab display ${tab === "local" ? "on" : ""}`}
            onClick={() => setTab("local")}
          >
            This device
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "room"}
            className={`setup-tab display ${tab === "room" ? "on" : ""}`}
            onClick={() => setTab("room")}
          >
            Across devices
          </button>
        </div>

        {tab === "local" ? (
          <>
            <section className="setup-panel">
              <span className="panel-tab display">Players</span>
              <div className="count-row" role="group" aria-label="Number of players">
                <button type="button" className="count-step" onClick={() => setCountSafe(count - 1)}>
                  −
                </button>
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`count-digit display ${n === count ? "on" : ""}`}
                    onClick={() => setCountSafe(n)}
                  >
                    {n}
                  </button>
                ))}
                <button type="button" className="count-step" onClick={() => setCountSafe(count + 1)}>
                  +
                </button>
              </div>
              <div className="name-list">
                {names.map((name, i) => (
                  <label key={i} className="name-field">
                    <span className="name-index display">{i + 1}</span>
                    <input
                      value={name}
                      placeholder={`PLAYER ${i + 1}`}
                      onChange={(e) =>
                        setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))
                      }
                    />
                  </label>
                ))}
              </div>
            </section>
            {modeBox}
            <button
              type="button"
              className="start-btn display"
              onClick={() =>
                props.onStartLocal(
                  names.map((name, i) => ({
                    id: `p${i}`,
                    name: name.trim() || `Player ${i + 1}`,
                  })),
                  turnMode,
                )
              }
            >
              Start game
            </button>
          </>
        ) : (
          <>
            <div className="room-subtabs">
              <button
                type="button"
                className={`room-subtab display ${roomTab === "create" ? "on" : ""}`}
                onClick={() => setRoomTab("create")}
              >
                Create room
              </button>
              <button
                type="button"
                className={`room-subtab display ${roomTab === "join" ? "on" : ""}`}
                onClick={() => setRoomTab("join")}
              >
                Join room
              </button>
            </div>
            {roomTab === "create" ? (
              <section className="setup-panel">
                <span className="panel-tab display">Host</span>
                <label className="name-field solo-field">
                  <span className="name-index display">★</span>
                  <input
                    value={hostName}
                    placeholder="YOUR NAME"
                    onChange={(e) => setHostName(e.target.value)}
                  />
                </label>
              </section>
            ) : (
              <section className="setup-panel">
                <span className="panel-tab display">Join</span>
                <label className="name-field solo-field">
                  <span className="name-index display">#</span>
                  <input
                    value={joinCode}
                    placeholder="ROOM CODE"
                    maxLength={4}
                    onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
                  />
                </label>
                <label className="name-field solo-field">
                  <span className="name-index display">★</span>
                  <input
                    value={joinName}
                    placeholder="YOUR NAME"
                    onChange={(e) => setJoinName(e.target.value)}
                  />
                </label>
              </section>
            )}
            {roomTab === "create" ? modeBox : null}
            {props.roomError ? <p className="notice">{props.roomError}</p> : null}
            <button
              type="button"
              className="start-btn display"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                if (roomTab === "create") {
                  props.onCreateRoom(hostName.trim() || "Player 1", turnMode);
                } else {
                  props.onJoinRoom(joinCode, joinName.trim() || "Player");
                }
                setBusy(false);
              }}
            >
              {roomTab === "create" ? "Create room" : "Join room"}
            </button>
          </>
        )}

        {props.notice === "corrupt" ? (
          <p className="notice">Saved game was damaged. Starting fresh.</p>
        ) : null}

        <footer className="setup-footer">
          <h1 className="display">Build the table.</h1>
          <p className="divider-note display">
            <span className="rule" />
            {tab === "local" ? "2 to 6 players · one computer" : "2 to 6 players · your own screen"}
            <span className="rule" />
          </p>
        </footer>
      </div>
    </main>
  );
}
