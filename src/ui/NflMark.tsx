export function NflMark(props: { size?: number; gold?: boolean }) {
  const s = props.size ?? 40;
  return (
    <img
      className="app-mark"
      src="/icons/icon-192.png"
      width={s}
      height={s}
      alt="Dream Team NFL"
    />
  );
}
