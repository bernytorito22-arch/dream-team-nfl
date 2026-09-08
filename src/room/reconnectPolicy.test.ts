import { describe, expect, it } from "vitest";
import { ROOM_ERRORS } from "./protocol";
import { isFatalRoomError, shouldRetryReconnect } from "./reconnectPolicy";

describe("reconnect policy", () => {
  it("retries after a dropped socket with no fatal error", () => {
    expect(
      shouldRetryReconnect({ leaveIntentional: false, lastError: null }),
    ).toBe(true);
  });

  it("does not retry after Home", () => {
    expect(
      shouldRetryReconnect({ leaveIntentional: true, lastError: null }),
    ).toBe(false);
  });

  it("does not retry when the room is gone", () => {
    expect(isFatalRoomError(ROOM_ERRORS.notFound)).toBe(true);
    expect(isFatalRoomError(ROOM_ERRORS.hostLeft)).toBe(true);
    expect(
      shouldRetryReconnect({
        leaveIntentional: false,
        lastError: ROOM_ERRORS.notFound,
      }),
    ).toBe(false);
  });

  it("does not retry when the server closes a missing room", () => {
    expect(
      shouldRetryReconnect({
        leaveIntentional: false,
        lastError: null,
        closeCode: 4004,
      }),
    ).toBe(false);
  });

  it("does not treat a score failure as a dead room", () => {
    expect(isFatalRoomError("Couldn't score this one — try again.")).toBe(false);
    expect(
      shouldRetryReconnect({
        leaveIntentional: false,
        lastError: "Couldn't score this one — try again.",
      }),
    ).toBe(true);
  });
});
