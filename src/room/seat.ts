export const SEAT_STORAGE_KEY = "dream-team-nfl-seat-v1";

export type StoredSeat = {
  roomCode: string;
  playerId: string;
  seatToken: string;
};

export function saveSeat(seat: StoredSeat, storage: Storage = localStorage): void {
  storage.setItem(SEAT_STORAGE_KEY, JSON.stringify(seat));
}

export function loadSeat(storage: Storage = localStorage): StoredSeat | null {
  const raw = storage.getItem(SEAT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSeat;
    if (
      typeof parsed.roomCode === "string" &&
      typeof parsed.playerId === "string" &&
      typeof parsed.seatToken === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSeat(storage: Storage = localStorage): void {
  storage.removeItem(SEAT_STORAGE_KEY);
}
