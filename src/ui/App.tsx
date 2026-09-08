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
import { normalizeRoomCode } from "../room/codes";
import { ROOM_ERRORS } from "../room/protocol";
import { clearSeat, loadSeat, saveSeat } from "../room/seat";
import { LobbyScreen } from "./LobbyScreen";
import { PickScreen } from "./PickScreen";
import { RevealScreen } from "./RevealScreen";
import {
  createRoomApi,
  openRoomSocket,
  type RoomSnapshot,
  type RoomSocket,
} from "./roomClient";
import { SetupScreen } from "./SetupScreen";
import { SpinScreen } from "./SpinScreen";
import { WaitScreen } from "./WaitScreen";

const league = leagueJson as League;
const SPIN_MS = 1600;

type AppMode = "setup" | "local" | "room";

function parseJoinCodeFromPath(): string | undefined {
  const m = window.location.pathname.match(/^\/r\/([A-Za-z0-9]{4})$/);
  return m ? normalizeRoomCode(m[1]!) : undefined;
}

export function App() {
  const [appMode, setAppMode] = useState<AppMode>("setup");
  const [notice, setNotice] = useState<"none" | "corrupt">("none");
  const [state, setState] = useState<GameState | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [showTiebreak, setShowTiebreak] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [joinCodePrefill] = useState(parseJoinCodeFromPath);
  const [roomSnap, setRoomSnap] = useState<RoomSnapshot | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const roomSocket = useRef<RoomSocket | null>(null);
  const leaveIntentional = useRef(false);
  const [localWheelSpinning, setLocalWheelSpinning] = useState(false);

  useEffect(() => {
    const loaded = loadGame();
    if (loaded.ok) {
      setState(loaded.state);
      setAppMode("local");
    } else if (loaded.notice === "corrupt") {
      setNotice("corrupt");
    }

    const seat = loadSeat();
    if (seat && !loaded.ok) {
      connectToRoom(seat.roomCode, { token: seat.seatToken });
    }
  }, []);

  useEffect(() => {
    if (appMode === "local" && state) saveGame(state);
  }, [appMode, state]);

  useEffect(() => {
    return () => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
      roomSocket.current?.close();
    };
  }, []);

  const assetName = useMemo(() => {
    const extras =
      appMode === "local"
        ? (state?.customAssets ?? [])
        : (roomSnap?.session.game?.customAssets ?? []);
    return (id: string) => findAsset(league, extras, id)?.name ?? id;
  }, [appMode, state?.customAssets, roomSnap?.session.game?.customAssets]);

  function stopSpinTimer() {
    if (spinTimer.current) {
      clearTimeout(spinTimer.current);
      spinTimer.current = null;
    }
  }

  function closeRoomSocket() {
    roomSocket.current?.close();
    roomSocket.current = null;
  }

  function handleRoomSnapshot(snap: RoomSnapshot) {
    setRoomSnap(snap);
    setReconnecting(false);
    if (snap.session.destroyed) {
      setRoomError(ROOM_ERRORS.hostLeft);
      closeRoomSocket();
      setAppMode("setup");
      setRoomSnap(null);
      return;
    }
    saveSeat({
      roomCode: snap.session.code,
      playerId: snap.you.playerId,
      seatToken: snap.you.seatToken,
    });
    setViewingId((current) => current ?? snap.you.playerId);
    if (snap.session.phase === "play" && snap.session.game) {
      setAppMode("room");
      setRoomError(null);
    } else if (snap.session.phase === "lobby") {
      setAppMode("room");
    }
    if (snap.session.scoring) {
      setScoring(true);
    } else {
      setScoring(false);
    }
  }

  function connectToRoom(
    code: string,
    opts?: { token?: string; guestName?: string },
  ) {
    closeRoomSocket();
    leaveIntentional.current = false;
    setReconnecting(true);
    setRoomError(null);
    const socket = openRoomSocket(
      code,
      {
        onSnapshot: handleRoomSnapshot,
        onError: (err) => {
          setRoomError(err);
          if (err === SCORE_ERROR) setScoreError(SCORE_ERROR);
          if (err === ROOM_ERRORS.hostLeft) {
            setAppMode("setup");
            setRoomSnap(null);
            closeRoomSocket();
          }
        },
        onClose: () => {
          if (leaveIntentional.current) {
            leaveIntentional.current = false;
            setReconnecting(false);
            return;
          }
          const seat = loadSeat();
          if (seat && seat.roomCode === code.toUpperCase()) {
            setReconnecting(true);
            window.setTimeout(
              () => connectToRoom(seat.roomCode, { token: seat.seatToken }),
              1500,
            );
          }
        },
      },
      opts,
    );
    roomSocket.current = socket;
  }

  function goHomeLocal() {
    stopSpinTimer();
    clearGame();
    setState(null);
    setAppMode("setup");
    setScoring(false);
    setScoreError(null);
    setShowWhy(false);
    setShowTiebreak(false);
    setViewingId(null);
  }

  function goHomeRoom() {
    stopSpinTimer();
    leaveIntentional.current = true;
    roomSocket.current?.send({ type: "leave" });
    closeRoomSocket();
    setRoomSnap(null);
    setAppMode("setup");
    setScoring(false);
    setScoreError(null);
    setShowWhy(false);
    setShowTiebreak(false);
    setViewingId(null);
    setLocalWheelSpinning(false);
    setReconnecting(false);
  }

  function resetDraftLocal() {
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

  async function handleCreateRoom(hostName: string, turnMode: TurnMode) {
    try {
      const created = await createRoomApi(hostName, turnMode);
      saveSeat({
        roomCode: created.code,
        playerId: created.playerId,
        seatToken: created.seatToken,
      });
      connectToRoom(created.code, { token: created.seatToken });
      setAppMode("room");
    } catch {
      setRoomError("Could not create room");
    }
  }

  function handleJoinRoom(code: string, name: string) {
    const normalized = normalizeRoomCode(code);
    if (normalized.length !== 4) {
      setRoomError(ROOM_ERRORS.notFound);
      return;
    }
    connectToRoom(normalized, { guestName: name.trim() || "Player" });
    setAppMode("room");
  }

  const chrome = <div className="stadium-bg" />;

  if (appMode === "setup") {
    return (
      <>
        {chrome}
        <SetupScreen
          notice={notice}
          initialJoinCode={joinCodePrefill}
          roomError={roomError}
          onStartLocal={(players, turnMode) => {
            setState(startGame(players, turnMode));
            setViewingId(players[0]?.id ?? null);
            setAppMode("local");
            setNotice("none");
            clearSeat();
          }}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      </>
    );
  }

  if (appMode === "room" && roomSnap) {
    const { you, session } = roomSnap;
    const game = session.game;
    const canReset = you.isHost;
    const reconnectBanner = reconnecting ? (
      <p className="reconnect-banner notice">Reconnecting…</p>
    ) : null;

    if (session.phase === "lobby") {
      return (
        <>
          {chrome}
          {reconnectBanner}
          <LobbyScreen
            you={you}
            session={session}
            error={roomError}
            onStart={() => roomSocket.current?.send({ type: "start" })}
            onKick={(playerId) => roomSocket.current?.send({ type: "kick", playerId })}
            onHome={goHomeRoom}
          />
        </>
      );
    }

    if (!game) {
      return (
        <>
          {chrome}
          <p className="notice">Loading room…</p>
        </>
      );
    }

    const onClockId =
      game.phase === "spin" || game.phase === "pick" ? currentPlayerId(game) : null;
    const onClock = you.playerId === onClockId;
    const railViewId =
      viewingId && game.players.some((p) => p.id === viewingId)
        ? viewingId
        : (onClockId ?? game.players[0].id);

    const rail = {
      viewingId: railViewId,
      onClockId,
      onView: setViewingId,
      onHome: goHomeRoom,
      onReset: () => roomSocket.current?.send({ type: "playAgain" }),
      canReset,
    };

    const wheelState: GameState =
      localWheelSpinning && game.phase === "pick" && game.currentTeamId
        ? { ...game, phase: "spin", spinning: true, currentTeamId: null }
        : game;

    if (onClock && (game.phase === "spin" || (game.phase === "pick" && localWheelSpinning))) {
      return (
        <>
          {chrome}
          {reconnectBanner}
          <SpinScreen
            state={wheelState}
            league={league}
            assetName={assetName}
            viewingId={rail.viewingId}
            onClockId={rail.onClockId}
            onView={rail.onView}
            onHome={rail.onHome}
            onReset={rail.onReset}
            canReset={canReset}
            canSpin={!localWheelSpinning}
            onSpin={() => {
              if (localWheelSpinning) return;
              roomSocket.current?.send({ type: "spin" });
              setLocalWheelSpinning(true);
              if (spinTimer.current) clearTimeout(spinTimer.current);
              spinTimer.current = setTimeout(() => {
                setLocalWheelSpinning(false);
              }, SPIN_MS);
            }}
          />
        </>
      );
    }

    if (onClock && game.phase === "pick") {
      return (
        <>
          {chrome}
          {reconnectBanner}
          <PickScreen
            state={game}
            league={league}
            assetName={assetName}
            viewingId={rail.viewingId}
            onClockId={rail.onClockId}
            onView={rail.onView}
            onHome={rail.onHome}
            onReset={rail.onReset}
            canReset={canReset}
            onLock={(assetId, slotId: SlotId, writeIn?: { name: string; group: MenuGroup }) =>
              roomSocket.current?.send({ type: "pick", assetId, slotId, writeIn })
            }
          />
        </>
      );
    }

    if (!onClock && (game.phase === "spin" || game.phase === "pick")) {
      return (
        <>
          {chrome}
          {reconnectBanner}
          <WaitScreen
            state={game}
            league={league}
            assetName={assetName}
            viewingId={rail.viewingId}
            onClockId={rail.onClockId}
            onView={rail.onView}
            onHome={rail.onHome}
          />
        </>
      );
    }

    return (
      <>
        {chrome}
        {reconnectBanner}
        <RevealScreen
          state={game}
          viewingId={rail.viewingId}
          onView={rail.onView}
          assetName={assetName}
          onHome={rail.onHome}
          onReset={rail.onReset}
          canReset={canReset}
          scoring={session.scoring || scoring}
          scoreError={scoreError}
          showWhy={showWhy}
          showTiebreak={showTiebreak}
          onReveal={() => {
            setScoreError(null);
            roomSocket.current?.send({ type: "reveal" });
          }}
          onWhy={() => setShowWhy(true)}
          onTiebreak={() => setShowTiebreak(true)}
          onPlayAgain={() => {
            if (!you.isHost) return;
            setShowWhy(false);
            setShowTiebreak(false);
            setScoreError(null);
            roomSocket.current?.send({ type: "playAgain" });
          }}
        />
      </>
    );
  }

  if (!state) {
    return (
      <>
        {chrome}
        <SetupScreen
          notice={notice}
          initialJoinCode={joinCodePrefill}
          roomError={roomError}
          onStartLocal={(players, turnMode) => {
            setState(startGame(players, turnMode));
            setViewingId(players[0]?.id ?? null);
            setAppMode("local");
          }}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      </>
    );
  }

  const onClockId =
    state.phase === "spin" || state.phase === "pick" ? currentPlayerId(state) : null;
  const railViewId =
    viewingId && state.players.some((p) => p.id === viewingId)
      ? viewingId
      : (onClockId ?? state.players[0].id);

  const rail = {
    viewingId: railViewId,
    onClockId,
    onView: setViewingId,
    onHome: goHomeLocal,
    onReset: resetDraftLocal,
    canReset: true,
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
