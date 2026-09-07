import { describe, expect, it } from "vitest";
import { startGame } from "./engine";
import { clearGame, loadGame, saveGame } from "./persist";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear() { map.clear(); },
    getItem(k) { return map.get(k) ?? null; },
    setItem(k, v) { map.set(k, v); },
    removeItem(k) { map.delete(k); },
    key(i) { return [...map.keys()][i] ?? null; },
  };
}

describe("persist", () => {
  it("round-trips a started game", () => {
    const storage = memoryStorage();
    const state = startGame(
      [{ id: "p0", name: "Berny" }, { id: "p1", name: "Andres" }],
      "snake",
    );
    saveGame(state, storage);
    const loaded = loadGame(storage);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state.players[0].name).toBe("Berny");
      expect(loaded.state.turnMode).toBe("snake");
    }
  });

  it("clearGame removes a saved game", () => {
    const storage = memoryStorage();
    saveGame(
      startGame(
        [{ id: "p0", name: "Berny" }, { id: "p1", name: "Andres" }],
        "roundRobin",
      ),
      storage,
    );
    clearGame(storage);
    expect(loadGame(storage)).toEqual({ ok: false, notice: "missing" });
  });

  it("loads older saves that omit customAssets", () => {
    const storage = memoryStorage();
    const state = startGame(
      [{ id: "p0", name: "Berny" }, { id: "p1", name: "Andres" }],
      "roundRobin",
    );
    const { customAssets: _drop, ...legacy } = state;
    storage.setItem("dream-team-nfl-v1", JSON.stringify(legacy));
    const loaded = loadGame(storage);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.state.customAssets).toEqual([]);
  });

  it("corrupt JSON returns notice corrupt", () => {
    const storage = memoryStorage();
    storage.setItem("dream-team-nfl-v1", "{not-json");
    expect(loadGame(storage)).toEqual({ ok: false, notice: "corrupt" });
  });
});
