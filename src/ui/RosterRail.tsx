import { useEffect, useState, type PointerEvent } from "react";
import { SLOT_DEFS } from "../league/ids";
import type { DreamTeam, PlayerSetup, SlotId } from "../league/types";
import { NflMark } from "./NflMark";

const RAIL_MIN = 160;
const RAIL_MAX = 480;
const RAIL_DEFAULT = 230;
const RAIL_KEY = "dream-team-nfl:rail-width";

function clampRail(n: number): number {
  return Math.min(RAIL_MAX, Math.max(RAIL_MIN, n));
}

export function RosterRail(props: {
  players: PlayerSetup[];
  teams: DreamTeam[];
  viewingId: string;
  onView: (playerId: string) => void;
  onClockId?: string | null;
  leagueName: (assetId: string) => string;
  activeSlotId?: SlotId | null;
  modeBadge?: string;
  onHome: () => void;
  onReset: () => void;
  canReset?: boolean;
  readOnly?: boolean;
}) {
  const team = props.teams.find((t) => t.playerId === props.viewingId) ?? props.teams[0];
  const filled = team?.picks.length ?? 0;
  const [width, setWidth] = useState(() => {
    const raw = localStorage.getItem(RAIL_KEY);
    const n = raw ? Number(raw) : RAIL_DEFAULT;
    return Number.isFinite(n) ? clampRail(n) : RAIL_DEFAULT;
  });
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--rail-width", `${width}px`);
    localStorage.setItem(RAIL_KEY, String(width));
  }, [width]);

  function onResizePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startW = width;
    function move(next: globalThis.PointerEvent) {
      setWidth(clampRail(startW + next.clientX - startX));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <aside className="rail">
      <div
        className="rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={RAIL_MIN}
        aria-valuemax={RAIL_MAX}
        aria-valuenow={width}
        aria-label="Roster width"
        tabIndex={0}
        onPointerDown={onResizePointerDown}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setWidth((w) => clampRail(w - 16));
          if (event.key === "ArrowRight") setWidth((w) => clampRail(w + 16));
        }}
      />
      <header className="rail-brand">
        <NflMark size={36} />
        <span className="brand-word display">Dream<br />Team</span>
      </header>
      <nav className="rail-session" aria-label="Session">
        <button type="button" className="session-btn" onClick={props.onHome}>
          Home
        </button>
        {props.canReset !== false ? (
          <button type="button" className="session-btn" onClick={() => setAsking(true)}>
            Reset
          </button>
        ) : null}
      </nav>
      {asking ? (
        <div className="confirm-scrim" role="presentation">
          <div
            className="confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title" className="display">
              Start over?
            </h2>
            <p>This clears every pick and begins a new draft with the same players.</p>
            <div className="confirm-actions">
              <button type="button" onClick={() => setAsking(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setAsking(false);
                  props.onReset();
                }}
              >
                Yes, start over
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {props.modeBadge ? (
        <p className="mode-badge display">{props.modeBadge}</p>
      ) : null}

      <p className="rail-label display">Rosters</p>
      <div className="rail-players" role="tablist" aria-label="View a roster">
        {props.players.map((player) => {
          const viewing = player.id === props.viewingId;
          const onClock = player.id === props.onClockId;
          return (
            <button
              key={player.id}
              type="button"
              role="tab"
              aria-selected={viewing}
              className={["rail-player", viewing ? "viewing" : "", onClock ? "on-clock" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => props.onView(player.id)}
            >
              <span className="rail-player-name">{player.name}</span>
              {onClock ? <span className="rail-turn display">Turn</span> : null}
            </button>
          );
        })}
      </div>

      <p className="rail-title">
        {team?.name ?? "Roster"} · {filled}/9
      </p>
      <ol>
        {SLOT_DEFS.map((slot) => {
          const pick = team?.picks.find((p) => p.slotId === slot.id);
          const isActive = props.activeSlotId === slot.id;
          return (
            <li
              key={slot.id}
              className={[pick ? "filled" : "empty", isActive ? "active" : ""]
                .filter(Boolean)
                .join(" ") || undefined}
            >
              <span className="rail-slot">{slot.label}</span>
              <span className="rail-name">
                {pick ? props.leagueName(pick.assetId) : "—"}
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
