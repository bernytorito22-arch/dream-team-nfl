export function ResetConfirm(props: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!props.open) return null;

  return (
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
          <button type="button" onClick={props.onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={props.onConfirm}>
            Yes, start over
          </button>
        </div>
      </div>
    </div>
  );
}
