import { describe, expect, it, vi } from "vitest";
import {
  attachCompactLayoutListener,
  COMPACT_QUERY,
  readCompactLayout,
} from "./useCompactLayout";

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mq = {
    matches,
    media: COMPACT_QUERY,
    addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => {
      listeners.add(fn);
    },
    removeEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => {
      listeners.delete(fn);
    },
    dispatch(next: boolean) {
      this.matches = next;
      listeners.forEach((fn) => fn({ matches: next } as MediaQueryListEvent));
    },
  };
  vi.stubGlobal("matchMedia", (_query: string) => mq);
  return mq;
}

describe("useCompactLayout helpers", () => {
  it("readCompactLayout returns true when the query matches", () => {
    mockMatchMedia(true);
    expect(readCompactLayout()).toBe(true);
  });

  it("readCompactLayout returns false when the query does not match", () => {
    mockMatchMedia(false);
    expect(readCompactLayout()).toBe(false);
  });

  it("attachCompactLayoutListener fires when the query changes", () => {
    const mq = mockMatchMedia(true);
    const onChange = vi.fn();
    const detach = attachCompactLayoutListener(onChange);

    mq.dispatch(false);
    expect(onChange).toHaveBeenCalledWith(false);

    detach();
    mq.dispatch(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
