import { useEffect, useMemo, useRef, useState } from "react";
import leagueJson from "../data/league.json";
import { fetchReveal, SCORE_ERROR } from "../ai/client";
import {
  applyVerdict,
  beginSpin,
  completeSpin,
  currentPlayerId,
  lockPick,
  playAgain,
  startGame,
  type GameState,
} from "../game/engine";
import { clearGame, loadGame, saveGame } from "../game/persist";
import { findAsset } from "../league/names";
import type { League, MenuGroup, SlotId, TurnMode } from "../league/types";
import { PickScreen } from "./PickScreen";
import { RevealScreen } from "./RevealScreen";
import { SetupScreen } from "./SetupScreen";
import { SpinScreen } from "./SpinScreen";

const league = leagueJson as League;
const SPIN_MS = 1600;

export function App() {
  const [mode, setMode] = useState<"setup" | "play">("setup");
  const [notice, setNotice] = useState<"none" | "corrupt">("none");
  const [state, setState] = useState<GameState | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [showTiebreak, setShowTiebreak] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loaded = loadGame();
    if (loaded.ok) {
      setState(loaded.state);
      setMode("play");
    } else if (loaded.notice === "corrupt") {
      setNotice("corrupt");
    }
  }, []);

  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);

  useEffect(() => {
    return () => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
    };
  }, []);

  const assetName = useMemo(() => {
    const extras = state?.customAssets ?? [];
    return (id: string) => findAsset(league, extras, id)?.name ?? id;
  }, [state?.customAssets]);

  function stopSpinTimer() {
    if (spinTimer.current) {
      clearTimeout(spinTimer.current);
      spinTimer.current = null;
    }
  }

  function goHome() {
    stopSpinTimer();
    clearGame();
    setState(null);
    setMode("setup");
    setScoring(false);
    setScoreError(null);
    setShowWhy(false);
    setShowTiebreak(false);
    setViewingId(null);
  }

  function resetDraft() {
    stopSpinTimer();
    setShowWhy(false);
    setShowTiebreak(false);
    setScoreError(null);
    setScoring(false);
    setState((current) => {
      if (!current) return current;
      setViewingId(current.players[0]?.id ?? null);
      return playAgain(current);
    });
  }

  if (mode === "setup" || !state) {
    return (
      <>
        <div className="stadium-bg" />
        <SetupScreen
          notice={notice}
          onStart={(players, turnMode: TurnMode) => {
            setState(startGame(players, turnMode));
            setViewingId(players[0]?.id ?? null);
            setMode("play");
            setNotice("none");
          }}
        />
      </>
    );
  }

  const onClockId =
    state.phase === "spin" || state.phase === "pick"
      ? currentPlayerId(state)
      : null;
  const railViewId =
    viewingId && state.players.some((p) => p.id === viewingId)
      ? viewingId
      : (onClockId ?? state.players[0].id);

  const chrome = <div className="stadium-bg" />;

  const rail = {
    viewingId: railViewId,
    onClockId,
    onView: setViewingId,
    onHome: goHome,
    onReset: resetDraft,
  };

  if (state.phase === "spin") {
    return (
      <>
        {chrome}
        <SpinScreen
        state={state}
        league={league}
        assetName={assetName}
        viewingId={rail.viewingId}
        onClockId={rail.onClockId}
        onView={rail.onView}
        onHome={rail.onHome}
        onReset={rail.onReset}
        onSpin={() => {
          setState(beginSpin(state));
          if (spinTimer.current) clearTimeout(spinTimer.current);
          spinTimer.current = setTimeout(() => {
            setState((current) =>
              current ? completeSpin(current, league, Math.random) : current,
            );
          }, SPIN_MS);
        }}
      />
      </>
    );
  }

  if (state.phase === "pick") {
    return (
      <>
        {chrome}
        <PickScreen
        state={state}
        league={league}
        assetName={assetName}
        viewingId={rail.viewingId}
        onClockId={rail.onClockId}
        onView={rail.onView}
        onHome={rail.onHome}
        onReset={rail.onReset}
        onLock={(assetId, slotId: SlotId, writeIn?: { name: string; group: MenuGroup }) =>
          setState(lockPick(state, league, assetId, slotId, writeIn))
        }
      />
      </>
    );
  }

  return (
    <>
      {chrome}
      <RevealScreen
      state={state}
      viewingId={rail.viewingId}
      onView={rail.onView}
      assetName={assetName}
      onHome={rail.onHome}
      onReset={rail.onReset}
      scoring={scoring}
      scoreError={scoreError}
      showWhy={showWhy}
      showTiebreak={showTiebreak}
      onReveal={async () => {
        setScoring(true);
        setScoreError(null);
        const result = await fetchReveal(state.dreamTeams, league, state.customAssets ?? []);
        setScoring(false);
        if (!result.ok) {
          setScoreError(SCORE_ERROR);
          return;
        }
        setState(applyVerdict(state, result.verdict));
      }}
      onWhy={() => setShowWhy(true)}
      onTiebreak={() => setShowTiebreak(true)}
      onPlayAgain={() => {
        setShowWhy(false);
        setShowTiebreak(false);
        setScoreError(null);
        setState(playAgain(state));
      }}
    />
    </>
  );
}
