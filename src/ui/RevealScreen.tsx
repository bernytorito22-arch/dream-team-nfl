import { SCORE_ERROR } from "../ai/client";
import type { GameState } from "../game/engine";
import { PlayChrome } from "./PlayChrome";
import { RosterRail } from "./RosterRail";
import { Stars } from "./Stars";
import { useCompactLayout } from "./useCompactLayout";

function Medallion(props: { name: string; record: string; winner: boolean }) {
  const rivets = 18;
  return (
    <div className={`medallion ${props.winner ? "winner-medal" : ""}`}>
      <svg viewBox="0 0 200 200" className="medallion-ring" aria-hidden="true">
        <defs>
          <linearGradient id={`medal-rim-${props.name}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8c95c" />
            <stop offset="50%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#8c6a2f" />
          </linearGradient>
        </defs>
        <circle cx={100} cy={100} r={92} fill="#0b1a2b" />
        <circle cx={100} cy={100} r={92} fill="none" stroke={`url(#medal-rim-${props.name})`} strokeWidth={12} />
        {Array.from({ length: rivets }, (_, i) => {
          const a = ((i * 360) / rivets - 90) * (Math.PI / 180);
          const x = 100 + 92 * Math.cos(a);
          const y = 100 + 92 * Math.sin(a);
          return <circle key={i} cx={x} cy={y} r={2.2} fill="#8c6a2f" stroke="#e8c95c" strokeWidth={0.5} />;
        })}
      </svg>
      <div className="medallion-face">
        <p className="medal-name display">{props.name}</p>
        <p className="medal-record display">{props.record}</p>
        <Stars filled={props.winner ? 4 : 3} total={props.winner ? 4 : 3} size={13} />
        <p className="medal-label display">Record</p>
      </div>
    </div>
  );
}

export function RevealScreen(props: {
  state: GameState;
  viewingId: string;
  onView: (playerId: string) => void;
  assetName: (id: string) => string;
  onHome: () => void;
  onReset: () => void;
  canReset?: boolean;
  scoring: boolean;
  scoreError: string | null;
  showWhy: boolean;
  showTiebreak: boolean;
  onReveal: () => void;
  onWhy: () => void;
  onTiebreak: () => void;
  onPlayAgain: () => void;
}) {
  const compact = useCompactLayout();
  const { state } = props;
  const modeLabel = state.turnMode === "snake" ? "Snake" : "Round robin";
  const rail = (
    <RosterRail
      players={state.players}
      teams={state.dreamTeams}
      viewingId={props.viewingId}
      onView={props.onView}
      leagueName={props.assetName}
      modeBadge={modeLabel}
      onHome={props.onHome}
      onReset={props.onReset}
      canReset={props.canReset}
    />
  );

  if (state.phase === "revealReady") {
    return (
      <main
        className={
          compact ? "shell reveal is-compact bg-photo bg-reveal" : "shell reveal bg-photo bg-reveal"
        }
      >
        <PlayChrome
          compact={compact}
          rail={rail}
          onHome={props.onHome}
          onReset={props.onReset}
          canReset={props.canReset}
        >
          <div className="reveal-ready">
            <h1 className="display">All 9 slots filled.</h1>
            <p className="sub">Ready to see the records?</p>
            {props.scoreError ? <p className="notice">{props.scoreError}</p> : null}
            <button
              className="start-btn display"
              type="button"
              disabled={props.scoring}
              onClick={props.onReveal}
            >
              {props.scoring ? "Scoring…" : "Reveal results"}
            </button>
          </div>
        </PlayChrome>
      </main>
    );
  }

  const records = state.verdict?.records ?? [];
  const champId = state.verdict?.championPlayerId;
  const champName = state.players.find((p) => p.id === champId)?.name ?? "";
  const showChamp = state.phase === "scored" || props.showTiebreak;

  const banner = (
    <footer className="lower tone-dark reveal-banner">
      <div className="lower-left">
        {showChamp ? (
          <>
            <h2 className="display">{champName} wins</h2>
            <p>★★★ Closest to 17-0 ★★★</p>
          </>
        ) : (
          <h2 className="display">Final records</h2>
        )}
      </div>
      <div className="banner-actions">
        {showChamp ? (
          <button type="button" className="banner-btn display" onClick={props.onWhy}>
            Why these records?
          </button>
        ) : null}
        {props.canReset !== false ? (
          <button type="button" className="play-again display" onClick={props.onPlayAgain}>
            Play again
          </button>
        ) : null}
      </div>
    </footer>
  );

  return (
    <main
      className={
        compact ? "shell reveal is-compact bg-photo bg-reveal" : "shell reveal bg-photo bg-reveal"
      }
    >
      <PlayChrome
        compact={compact}
        rail={rail}
        footer={banner}
        onHome={props.onHome}
        onReset={props.onReset}
        canReset={props.canReset}
      >
        <div className="reveal-stage">
          <div className="medallion-row">
            {records.map((r) => {
              const name = state.players.find((p) => p.id === r.playerId)?.name ?? r.playerId;
              return (
                <Medallion
                  key={r.playerId}
                  name={name}
                  record={r.record}
                  winner={showChamp && r.playerId === champId}
                />
              );
            })}
          </div>

          {state.phase === "tied" && !props.showTiebreak ? (
            <div className="reveal-actions">
              <button type="button" className="ghost-btn display" onClick={props.onTiebreak}>
                Tiebreaker
              </button>
            </div>
          ) : null}
          {state.phase === "tied" && props.showTiebreak ? (
            <p className="notice">{state.verdict?.tiebreakLine}</p>
          ) : null}

          {props.showWhy ? (
            <div className="why-grid">
              {records.map((r) => {
                const name = state.players.find((p) => p.id === r.playerId)?.name ?? r.playerId;
                return (
                  <article key={r.playerId} className="why-card">
                    <h3>
                      {name} — {r.record}
                    </h3>
                    <p>{r.paragraph}</p>
                    <p><span className="label">Strength</span> {r.strength}</p>
                    <p><span className="label">Hole</span> {r.hole}</p>
                    <p><span className="label">To watch</span> {r.playerToWatch}</p>
                  </article>
                );
              })}
            </div>
          ) : null}
          {props.scoreError ? <p className="notice">{SCORE_ERROR}</p> : null}
        </div>
      </PlayChrome>
    </main>
  );
}
