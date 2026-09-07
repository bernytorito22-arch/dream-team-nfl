import { useState } from "react";
import type { TurnMode } from "../league/types";
import { createSetupDefaults } from "../game/engine";
import { NflMark } from "./NflMark";

export function SetupScreen(props: {
  notice: "none" | "corrupt";
  onStart: (names: { id: string; name: string }[], turnMode: TurnMode) => void;
}) {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(() => createSetupDefaults(4).map((p) => p.name));
  const [turnMode, setTurnMode] = useState<TurnMode>("roundRobin");

  function setCountSafe(n: number) {
    const next = Math.min(6, Math.max(2, n));
    setCount(next);
    setNames((prev) =>
      createSetupDefaults(next).map((p, i) => prev[i] ?? p.name),
    );
  }

  return (
    <main className="shell setup bg-photo bg-stadium">
      <header className="brand-corner">
        <NflMark size={44} />
        <span className="brand-word display">Dream<br />Team</span>
      </header>

      <div className="setup-card">
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

        <div className="mode-box">
          <button
            type="button"
            className={`mode-option ${turnMode === "roundRobin" ? "active" : ""}`}
            onClick={() => setTurnMode("roundRobin")}
          >
            <span className="display">Round robin</span>
            <span className="mode-switch" aria-hidden="true"><span className="knob" /></span>
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

        {props.notice === "corrupt" ? (
          <p className="notice">Saved game was damaged. Starting fresh.</p>
        ) : null}

        <button
          type="button"
          className="start-btn display"
          onClick={() =>
            props.onStart(
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

        <footer className="setup-footer">
          <h1 className="display">Build the table.</h1>
          <p className="divider-note display">
            <span className="rule" />
            2 to 6 players · one computer
            <span className="rule" />
          </p>
        </footer>
      </div>
    </main>
  );
}
