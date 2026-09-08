import { legalTeamsForPlayer } from "../game/eligibility";
import { currentPlayerId, dreamTeamOf, type GameState } from "../game/engine";
import type { League } from "../league/types";
import { LowerThird } from "./LowerThird";
import { RosterRail } from "./RosterRail";
import { Wheel } from "./Wheel";

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
  const pid = currentPlayerId(props.state);
  const player = props.state.players.find((p) => p.id === pid)!;
  const dt = dreamTeamOf(props.state, pid);
  const legal = legalTeamsForPlayer(props.league, dt, props.state.takenAssetIds);
  const modeLabel = props.state.turnMode === "snake" ? "Snake" : "Round robin";
  return (
    <main className="shell bg-photo bg-stadium">
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
      <section className="stage">
        <Wheel
          teams={legal}
          spinning={props.state.spinning}
          onSpin={props.onSpin}
          spinDisabled={legal.length === 0 || props.canSpin === false}
        />
        {props.state.emptyLegal ? <p className="notice">No legal teams left</p> : null}
        <LowerThird
          title={`${player.name}'s turn`}
          meta={`Pick ${dt.picks.length + 1} of 9 · ${modeLabel}`}
          filledStars={Math.min(3, Math.ceil(((dt.picks.length + 1) / 9) * 3))}
        />
      </section>
    </main>
  );
}
