import { useEffect, useState, type PointerEvent } from "react";
import { emptySlots, legalMenu } from "../game/eligibility";
import { currentPlayerId, dreamTeamOf, type GameState, type WriteInDraft } from "../game/engine";
import { SLOT_DEFS } from "../league/ids";
import { normalizeAssetName, takenNameSet } from "../league/names";
import { teamLogoSrc } from "../league/teamLogo";
import type { League, LeagueAsset, MenuGroup, SlotId } from "../league/types";
import { LowerThird } from "./LowerThird";
import { RosterRail } from "./RosterRail";

const PANEL_MIN = 260;
const PANEL_MAX = 720;
const PANEL_DEFAULT = 420;
const PANEL_KEY = "dream-team-nfl:pick-panel-width";

function clampPanel(n: number): number {
  return Math.min(PANEL_MAX, Math.max(PANEL_MIN, n));
}

function teamNickname(team: { name: string; city: string }): string {
  const prefix = `${team.city} `;
  return team.name.startsWith(prefix) ? team.name.slice(prefix.length) : team.name;
}

export function PickScreen(props: {
  state: GameState;
  league: League;
  assetName: (id: string) => string;
  viewingId: string;
  onClockId: string | null;
  onView: (playerId: string) => void;
  onHome: () => void;
  onReset: () => void;
  onLock: (assetId: string, slotId: SlotId, writeIn?: WriteInDraft) => void;
}) {
  const pid = currentPlayerId(props.state);
  const player = props.state.players.find((p) => p.id === pid)!;
  const dt = dreamTeamOf(props.state, pid);
  const team = props.league.teams.find((t) => t.id === props.state.currentTeamId)!;
  const custom = props.state.customAssets ?? [];
  const menu = legalMenu(props.league, dt, props.state.takenAssetIds, team.id, custom);
  const takenNames = takenNameSet(props.league, props.state.takenAssetIds, custom);
  const [chosen, setChosen] = useState<LeagueAsset | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotId | null>(null);
  const [writeName, setWriteName] = useState("");
  const [writeGroup, setWriteGroup] = useState<MenuGroup>("qb");
  const open = emptySlots(dt);
  const openGroups = SLOT_DEFS.filter((d) => open.includes(d.id)).reduce<MenuGroup[]>((acc, d) => {
    if (!acc.includes(d.group)) acc.push(d.group);
    return acc;
  }, []);

  const slotsForAsset = (asset: LeagueAsset): SlotId[] =>
    open.filter((s) => SLOT_DEFS.find((d) => d.id === s)?.group === asset.group);

  const matchingSlots = chosen ? slotsForAsset(chosen) : [];
  const needsSlotPick = matchingSlots.length > 1;
  const effectiveSlot: SlotId | null = chosen
    ? needsSlotPick
      ? selectedSlot
      : (matchingSlots[0] ?? null)
    : null;

  const modeLabel = props.state.turnMode === "snake" ? "Snake" : "Round robin";
  const [panelWidth, setPanelWidth] = useState(() => {
    const raw = localStorage.getItem(PANEL_KEY);
    const n = raw ? Number(raw) : PANEL_DEFAULT;
    return Number.isFinite(n) ? clampPanel(n) : PANEL_DEFAULT;
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--pick-panel-width", `${panelWidth}px`);
    localStorage.setItem(PANEL_KEY, String(panelWidth));
  }, [panelWidth]);

  function onPanelResizeDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startW = panelWidth;
    function move(next: globalThis.PointerEvent) {
      setPanelWidth(clampPanel(startW - (next.clientX - startX)));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <main className="pick-shell">
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
      />
      <section className="pick-showcase bg-team">
        <div className="team-hero">
          <img
            className="team-logo-mark"
            src={teamLogoSrc(team.id)}
            alt=""
            width={152}
            height={152}
          />
          <div className="team-title">
            <p className="team-city display">{team.city}</p>
            <h1 className="team-name display">{teamNickname(team)}</h1>
          </div>
        </div>
      </section>

      <section className="pick-panel">
        <div
          className="panel-resize"
          role="separator"
          aria-orientation="vertical"
          aria-valuemin={PANEL_MIN}
          aria-valuemax={PANEL_MAX}
          aria-valuenow={panelWidth}
          aria-label="Pick list width"
          tabIndex={0}
          onPointerDown={onPanelResizeDown}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setPanelWidth((w) => clampPanel(w + 16));
            if (event.key === "ArrowRight") setPanelWidth((w) => clampPanel(w - 16));
          }}
        />
        <header className="pick-panel-head">
          <h2 className="display">Fill an empty slot</h2>
        </header>

        <ol className="menu-list">
          {menu.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                className={chosen?.id === asset.id ? "chosen" : ""}
                onClick={() => {
                  setChosen(asset);
                  setSelectedSlot(null);
                }}
              >
                <span className="slot-label display">
                  {SLOT_DEFS.find((s) => s.group === asset.group)?.label}
                </span>
                <span className="asset-name">{asset.name}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="write-in">
          <p className="display">Or write in anyone on this team</p>
          <label className="write-in-field">
            <span className="slot-label display">Slot</span>
            <select
              value={openGroups.includes(writeGroup) ? writeGroup : (openGroups[0] ?? "qb")}
              onChange={(event) => setWriteGroup(event.target.value as MenuGroup)}
            >
              {openGroups.map((group) => (
                <option key={group} value={group}>
                  {SLOT_DEFS.find((s) => s.group === group)?.label ?? group}
                </option>
              ))}
            </select>
          </label>
          <label className="write-in-field">
            <span className="slot-label display">Name</span>
            <input
              type="text"
              value={writeName}
              placeholder="Type a player, unit, or coach"
              maxLength={48}
              onChange={(event) => setWriteName(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={chosen?.id === "writein-draft" ? "write-in-use chosen" : "write-in-use"}
            disabled={writeName.trim().length < 2 || takenNames.has(normalizeAssetName(writeName))}
            onClick={() => {
              const group = openGroups.includes(writeGroup) ? writeGroup : openGroups[0];
              if (!group) return;
              setChosen({
                id: "writein-draft",
                name: writeName.trim(),
                kind: group === "def" || group === "oline" || group === "coach" ? "unit" : "player",
                group,
                teamId: team.id,
              });
              setSelectedSlot(null);
            }}
          >
            Use write-in
          </button>
          {writeName.trim().length >= 2 && takenNames.has(normalizeAssetName(writeName)) ? (
            <p className="write-in-error">That name is already on a dream team.</p>
          ) : null}
        </div>

        {needsSlotPick ? (
          <div className="slot-picker">
            <p className="display">Choose slot</p>
            {matchingSlots.map((slotId) => {
              const label = SLOT_DEFS.find((s) => s.id === slotId)?.label ?? slotId;
              return (
                <button
                  key={slotId}
                  type="button"
                  className={selectedSlot === slotId ? "selected" : ""}
                  onClick={() => setSelectedSlot(slotId)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <LowerThird
        title={`${player.name} · lock in`}
        meta={`${dt.picks.length + 1} of 9 · Roster completeness`}
        filledStars={Math.min(3, Math.ceil(((dt.picks.length + 1) / 9) * 3))}
        action={
          <button
            className="primary"
            type="button"
            disabled={!chosen || !effectiveSlot}
            onClick={() => {
              if (!chosen || !effectiveSlot) return;
              props.onLock(
                chosen.id,
                effectiveSlot,
                chosen.id === "writein-draft"
                  ? { name: chosen.name, group: chosen.group }
                  : undefined,
              );
            }}
          >
            Lock in
          </button>
        }
      />
    </main>
  );
}
