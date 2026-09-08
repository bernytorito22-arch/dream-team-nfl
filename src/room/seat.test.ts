import { describe, expect, it } from "vitest";
import { clearSeat, loadSeat, saveSeat, SEAT_STORAGE_KEY } from "./seat";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(k) {
      return map.get(k) ?? null;
    },
    setItem(k, v) {
      map.set(k, v);
    },
    removeItem(k) {
      map.delete(k);
    },
    key(i) {
      return [...map.keys()][i] ?? null;
    },
  };
}

describe("seat storage", () => {
  it("round-trips seat without touching game key", () => {
    const storage = memoryStorage();
    saveSeat({ roomCode: "7K2M", playerId: "p0", seatToken: "abc" }, storage);
    const loaded = loadSeat(storage);
    expect(loaded).toEqual({ roomCode: "7K2M", playerId: "p0", seatToken: "abc" });
    expect(storage.getItem("dream-team-nfl-v1")).toBeNull();
    expect(storage.getItem(SEAT_STORAGE_KEY)).not.toBeNull();
  });

  it("clearSeat removes saved seat", () => {
    const storage = memoryStorage();
    saveSeat({ roomCode: "ABCD", playerId: "p1", seatToken: "x" }, storage);
    clearSeat(storage);
    expect(loadSeat(storage)).toBeNull();
  });
});
