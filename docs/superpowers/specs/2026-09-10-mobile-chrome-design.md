# Dream Team NFL — Mobile chrome (phone-first layout, desktop unchanged)

Date: 2026-09-10  
Status: awaiting user review of this file  
Depends on: `docs/superpowers/specs/2026-09-03-nfl-dream-team-design.md`, `docs/superpowers/specs/2026-09-08-across-devices-rooms-design.md`

## Goal

Keep the current **desktop** layout and all game behavior exactly as they are today. Add a **phone chrome** so setup, lobby, spin, pick, wait, and reveal are usable with one thumb. The product is still the same draft: same rules, English copy, Look D (navy, gold, Oswald/display type), local play and rooms.

Primary pain today: **pick** stacks the roster rail, team hero, menu, and lock into a long scroll. The lock sits far from the list. Secondary: spin, setup, and the lower bar feel cramped.

## Out of scope

- Changing spin, pick, lock, reveal, rooms, or scoring rules
- New routes or a separate mobile app
- Duplicate screen components (`MobilePickScreen`, etc.)
- Redesigning desktop (three-column pick, resizable rail/panel, lower third)
- New visual brand (no new fonts, palettes, or motion language)
- QR codes, TV/host table UI, or PWA install flow changes beyond layout

## Approach

**Adaptive chrome on the existing screens.** One React tree. Below the breakpoint, CSS and a small amount of chrome (top bar, roster sheet, sticky action) rearrange the same `RosterRail`, `LowerThird`, wheel, and pick menu. Game state, sockets, and engine stay untouched.

Rejected: CSS-only restack of the current DOM (does not put lock next to the menu). Rejected: forked mobile screen files (behavior would drift from desktop).

## Breakpoint

- **`max-width: 767px`:** phone chrome.
- **`min-width: 768px`:** current desktop UI, including iPad landscape.

Resize or rotate only changes chrome. Phase, picks, `viewingId`, room seat, and timers must not reset.

## Pick (phone) — primary surface

Closed roster (default):

1. Top bar: **Home** (and **Reset** when allowed, same confirm dialog as today), wordmark, **Roster**.
2. One-line turn strip: whose turn (on-clock name).
3. Compact team block: logo + city + nickname (smaller than desktop hero so the list is the focus).
4. Full-width legal menu and write-in (same eligibility and copy).
5. Sticky bottom: **Lock pick** plus `name · filled/9`. Respect `env(safe-area-inset-bottom)`. Minimum tap height 44px.

Open roster:

- **Roster** opens a bottom sheet (scrim + sheet). The sheet reuses `RosterRail` for the player switcher and the 9 slots. On phone, Home/Reset exist only in the top bar; hide `.rail-session` inside the sheet so those actions are not duplicated.
- Tap scrim or Roster again closes the sheet. A successful lock also closes it.
- The sheet’s only game action is `onView` (switch which roster is displayed).

Desktop pick shell (`rail | showcase | panel`) is unchanged above 767px.

## Other screens (phone)

**Spin.** Same top bar and roster sheet. Larger wheel; hub/spin control ≥ 44px. Sticky **Spin** in the lower bar when the player can spin.

**Wait.** Same chrome. Copy or landed-team mark as today. No wheel. Roster sheet is view-only in the same sense as today’s rail (`readOnly` where already used).

**Setup and lobby.** Single column, larger fields and tabs. Room code stays large. This device / Across devices / create / join / start / kick flows unchanged.

**Reveal.** Medallions stack in one column. Why / tiebreak cards one column. Primary actions easy to reach (Reveal results, host Play again). Roster sheet still available to inspect teams.

## Components and data flow

No new game APIs. `App.tsx` still routes setup / local / room to the same screens.

| Unit | Job | Depends on |
|------|-----|------------|
| Phone top bar | Home, Reset, Roster toggle | existing `onHome` / `onReset` / `canReset` |
| Roster sheet | Present `RosterRail` in a dialog/sheet below 768px | `RosterRail`, `viewingId`, `onView` |
| Sticky action | Lock / Spin / Reveal primary control above the home indicator | existing `LowerThird`, sticky on phone |
| CSS `@media (max-width: 767px)` | Stack, hide desktop-only resize handles, disable `background-attachment: fixed` | `app.css`, `tokens.css` |

`RosterRail` and pick/spin/reveal screens stay the source of roster and menu data. Phone chrome is presentation only.

On phone, hide `.rail-resize` and `.panel-resize` (already hidden at 860px; keep them hidden in the 767 phone band).

## Platform details (phone only)

- Use `min-height: 100dvh` rather than `100vh` for full-height shells.
- Safe-area padding on top bar and sticky footer.
- Write-in keyboard: the pick list scrolls; Lock stays reachable (sticky footer, visual viewport).
- Do not use `background-attachment: fixed` under 768px (iOS scroll jank).

## Error handling

Room errors, score failure copy (`Couldn't score this one — try again.`), reconnect banner, and reset confirm stay the same. Phone layout must not cover the reconnect banner or make dialogs unscrollable.

## Testing

- Automated: existing Vitest suite must stay green. No engine or protocol changes required for this spec.
- Manual: ~390px width, pick path (open sheet, switch viewer, lock); spin hub; setup/lobby; reveal stack. ~1280px width: three-column pick, resizable rail/panel, lower third identical to current production.

## Success

A phone user can lock a pick without hunting the button. Desktop users cannot tell a layout change happened. Rooms and local play behave as in the 2026-09-08 spec.
