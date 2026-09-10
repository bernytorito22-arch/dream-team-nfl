import { useEffect, useState, type ReactNode } from "react";
import { NflMark } from "./NflMark";
import { ResetConfirm } from "./ResetConfirm";

export function PlayChrome(props: {
  compact: boolean;
  rail: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onHome: () => void;
  onReset: () => void;
  canReset?: boolean;
  turnLabel?: string;
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
}) {
  const [internalSheetOpen, setInternalSheetOpen] = useState(false);
  const [askingReset, setAskingReset] = useState(false);
  const showReset = props.canReset !== false;
  const sheetControlled = props.sheetOpen !== undefined;
  const sheetOpen = sheetControlled ? props.sheetOpen! : internalSheetOpen;

  useEffect(() => {
    if (!props.compact) {
      setOpen(false);
    }
  }, [props.compact]);

  function setOpen(next: boolean) {
    if (!sheetControlled) {
      setInternalSheetOpen(next);
    }
    props.onSheetOpenChange?.(next);
  }

  function toggleSheet() {
    setOpen(!sheetOpen);
  }

  if (!props.compact) {
    return (
      <>
        {props.rail}
        {props.children}
        {props.footer}
        <ResetConfirm
          open={askingReset}
          onCancel={() => setAskingReset(false)}
          onConfirm={() => {
            setAskingReset(false);
            props.onReset();
          }}
        />
      </>
    );
  }

  return (
    <>
      <header className="phone-top">
        <button type="button" className="phone-top-btn" onClick={props.onHome}>
          Home
        </button>
        <div className="phone-brand">
          <NflMark size={28} />
          <span className="brand-word display">Dream Team</span>
        </div>
        <div className="phone-top-actions">
          {showReset ? (
            <button type="button" className="phone-top-btn" onClick={() => setAskingReset(true)}>
              Reset
            </button>
          ) : null}
          <button
            type="button"
            className={`phone-top-btn ${sheetOpen ? "on" : ""}`}
            aria-expanded={sheetOpen}
            onClick={toggleSheet}
          >
            Roster
          </button>
        </div>
      </header>

      {props.turnLabel ? (
        <p className="phone-turn display">
          Turn · <strong>{props.turnLabel}</strong>
        </p>
      ) : null}

      <div className="phone-body">{props.children}</div>

      {props.footer}

      {sheetOpen ? (
        <>
          <button
            type="button"
            className="phone-sheet-scrim"
            aria-label="Close roster"
            onClick={() => setOpen(false)}
          />
          <div className="phone-sheet" role="dialog" aria-modal="true" aria-label="Rosters">
            {props.rail}
          </div>
        </>
      ) : null}

      <ResetConfirm
        open={askingReset}
        onCancel={() => setAskingReset(false)}
        onConfirm={() => {
          setAskingReset(false);
          props.onReset();
        }}
      />
    </>
  );
}
