import { useEffect, useState } from "react";

export const COMPACT_QUERY = "(max-width: 767px)";

function getMatchMedia(): typeof matchMedia | undefined {
  const g = globalThis as typeof globalThis & { matchMedia?: typeof matchMedia };
  return typeof g.matchMedia === "function" ? g.matchMedia : undefined;
}

export function readCompactLayout(): boolean {
  const matchMedia = getMatchMedia();
  if (!matchMedia) {
    return false;
  }
  return matchMedia(COMPACT_QUERY).matches;
}

export function attachCompactLayoutListener(onChange: (compact: boolean) => void): () => void {
  const matchMedia = getMatchMedia();
  if (!matchMedia) {
    return () => {};
  }
  const mq = matchMedia(COMPACT_QUERY);
  const handler = () => onChange(mq.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

export function useCompactLayout(): boolean {
  const [compact, setCompact] = useState(readCompactLayout);

  useEffect(() => attachCompactLayoutListener(setCompact), []);

  return compact;
}
