import { ROOM_ERRORS } from "./protocol";

export const ROOM_CLOSE_NOT_FOUND = 4004;

export function isFatalRoomError(error: string): boolean {
  return (
    error === ROOM_ERRORS.notFound ||
    error === ROOM_ERRORS.hostLeft ||
    error === ROOM_ERRORS.started ||
    error === ROOM_ERRORS.full
  );
}

export function shouldRetryReconnect(input: {
  leaveIntentional: boolean;
  lastError: string | null;
  closeCode?: number;
}): boolean {
  if (input.leaveIntentional) return false;
  if (input.closeCode === ROOM_CLOSE_NOT_FOUND) return false;
  if (input.lastError && isFatalRoomError(input.lastError)) return false;
  return true;
}
