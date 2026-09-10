import { legalTeamsForPlayer } from "../game/eligibility";
import { currentPlayerId, dreamTeamOf, type GameState } from "../game/engine";
import type { League } from "../league/types";
import { LowerThird } from "./LowerThird";
import { PlayChrome } from "./PlayChrome";
import { RosterRail } from "./RosterRail";
import { Wheel } from "./Wheel";
import { useCompactLayout } from "./useCompactLayout";

export function SpinScreen(props: {
  state: GameState;
  league: League;
  assetName: (id: string) => string;
  viewingId: string;
  onClockId: string | null;
  onView: (playerId: string) => void;
  onHome: () => void;
  onReset: () => void;
  canReset?: boolean;
  onSpin: () => void;
  canSpin?: boolean;
}) {
  const compact = useCompactLayout();
  const pid = currentPlayerId(props.state);
  const player = props.state.players.find((p) => p.id === pid)!;
  const dt = dreamTeamOf(props.state, pid);
  const legal = legalTeamsForPlayer(props.league, dt, props.state.takenAssetIds);
  const modeLabel = props.state.turnMode === "snake" ? "Snake" : "Round robin";
  const spinDisabled = legal.length === 0 || props.canSpin === false || props.state.spinning;

  const rail = (
    <RosterRail
      players={props.state.players}
      teams={props.state.dreamTeams}
      viewingId={props.viewingId}
      onClockId={props.onClockId}
      onView={props.onView}
      leagueName={props.assetName}
      modeBadge={modeLabel}
      onHome={props.onHome}
      onReset={props.onReset}
      canReset={props.canReset}
    />
  );

  const footer = (
    <LowerThird
      title={`${player.name}'s turn`}
      meta={`Pick ${dt.picks.length + 1} of 9 · ${modeLabel}`}
      filledStars={Math.min(3, Math.ceil(((dt.picks.length + 1) / 9) * 3))}
      action={
        compact ? (
          <button className="primary" type="button" disabled={spinDisabled} onClick={props.onSpin}>
            Spin
          </button>
        ) : undefined
      }
    />
  );

  return (
    <main className={compact ? "shell is-compact bg-photo bg-stadium" : "shell bg-photo bg-stadium"}>
      <PlayChrome
        compact={compact}
        rail={rail}
        footer={footer}
        onHome={props.onHome}
        onReset={props.onReset}
        canReset={props.canReset}
        turnLabel={player.name}
      >
        <section className="stage">
          <Wheel
            teams={legal}
            spinning={props.state.spinning}
            onSpin={props.onSpin}
            spinDisabled={legal.length === 0 || props.canSpin === false}
          />
          {props.state.emptyLegal ? <p className="notice">No legal teams left</p> : null}
        </section>
      </PlayChrome>
    </main>
  );
}
