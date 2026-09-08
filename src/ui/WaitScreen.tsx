import { currentPlayerId } from "../game/engine";
import type { GameState } from "../game/engine";
import type { League } from "../league/types";
import { teamLogoSrc } from "../league/teamLogo";
import { LowerThird } from "./LowerThird";
import { RosterRail } from "./RosterRail";

export function WaitScreen(props: {
  state: GameState;
  league: League;
  assetName: (id: string) => string;
  viewingId: string;
  onClockId: string | null;
  onView: (playerId: string) => void;
  onHome: () => void;
}) {
  const onClock = props.onClockId
    ? props.state.players.find((p) => p.id === props.onClockId)
    : null;
  const onClockName = onClock?.name ?? "Player";
  const teamId = props.state.currentTeamId;
  const team = teamId ? props.league.teams.find((t) => t.id === teamId) : null;
  const modeLabel = props.state.turnMode === "snake" ? "Snake" : "Round robin";
  const dt = props.state.dreamTeams.find((d) => d.playerId === currentPlayerId(props.state));

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
        onReset={() => {}}
        canReset={false}
        readOnly
      />
      <section className="stage wait-stage">
        {team ? (
          <div className="wait-landed">
            <img
              src={teamLogoSrc(team.id)}
              alt=""
              className="wait-logo"
              width={120}
              height={120}
            />
            <h1 className="display wait-title">
              {onClockName} landed on the {team.name}
            </h1>
            <p className="wait-sub">Picking now…</p>
          </div>
        ) : (
          <div className="wait-idle">
            <h1 className="display wait-title">Waiting for {onClockName}</h1>
            <p className="wait-sub">Their spin is up next.</p>
          </div>
        )}
        <LowerThird
          title={team ? `${onClockName} is picking` : `${onClockName}'s turn`}
          meta={
            dt
              ? `Pick ${dt.picks.length + 1} of 9 · ${modeLabel}`
              : modeLabel
          }
          filledStars={dt ? Math.min(3, Math.ceil(((dt.picks.length + 1) / 9) * 3)) : 0}
        />
      </section>
    </main>
  );
}
