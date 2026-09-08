# Dream Team NFL — Across-devices rooms

Date: 2026-09-08  
Status: awaiting user review of this file  
Depends on: `docs/superpowers/specs/2026-09-03-nfl-dream-team-design.md` (roster, uniqueness, wheel filter, AI verdict, Look D)

## Goal

Keep the current **This device** pass-and-play game. Add **Across devices**: one shared draft in a short-code room so 2–6 people can play on their own phones or laptops, at the same table or remote. Same rules, same English copy, same Look D. Closest predicted record to 17–0 still wins.

## Out of scope (v1)

- QR codes
- Spectator wheel animation (other devices do not spin)
- Skip turn, mid-draft kick, or bots
- Accounts, D1/Postgres, game history
- vs-AI opponent
- Changing roster rules, league JSON, or the reveal prompt
- A separate host-only “TV table” UI

## Two modes

Setup offers **This device** and **Across devices**.

**This device** is unchanged: names and turn mode on one screen, `startGame` in the client, persist full `GameState` to `localStorage` (`dream-team-nfl-v1`), client calls `POST /api/reveal`. Works without a room. Desktop-first; phone must still work.

**Across devices** never stores the draft in `localStorage`. The Durable Object is the authority. The phone only stores a seat: `{ roomCode, playerId, seatToken }` under a **different** key so a local save and a room seat cannot overwrite each other.

## Room identity

- Host creates a room → 4-character code, uppercase, no ambiguous glyphs: charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0/O`, `1/I`).
- Shareable URL: `/r/{code}` (example `/r/7K2M`). Opening it lands on Join with the code filled.
- One Durable Object instance per code. Codes that collide on create are retried.

## Lobby

**Create room:** you are the host. You type **your** name and pick round robin (default) or snake. You see the code large, the copyable link, and the player list.

**Join room:** type the code (or use the link) and **your** name. Join is allowed only before Start, and only if the room has fewer than 6 players.

**Lobby (everyone):** player list with the host marked; count toward 2–6. A 7th joiner gets `Room is full`. Bad/unknown code: `Room not found`.

**Host only:** remove a player from the lobby (before Start); **Start game** enabled at 2–6 players. Start calls `startGame` on the DO with lobby names and the host’s turn mode. After Start, nobody joins.

If the **host leaves before Start**, the room is destroyed. Everyone else returns to setup with `Host left`. If a **guest** leaves the lobby, they drop off the list and may re-join with the code until Start.

## Draft (across devices)

Reuse `engine.ts` on the DO: `startGame`, `beginSpin`, `completeSpin`, `lockPick`, `playAgain`, `applyVerdict`. Eligibility and uniqueness stay as in the 2026-09-03 spec.

**On the clock:** that player’s device shows the wheel and **Spin**. Nobody else can spin or pick. One `spin` message on the DO runs `beginSpin` then `completeSpin` with **server RNG** (not `Math.random()` in the browser). The snapshot is already `phase: "pick"` with `currentTeamId`. The on-clock client still plays the ~1.6s wheel, then shows Pick.

**Spectators:** no wheel. Before a team exists this turn: `Waiting for {name}`. After the spin snapshot: that franchise’s logo + name and that the player is picking. Roster rail is read-only for every dream team (same rail as today, tap to view).

If the on-clock player refreshes mid-animation, skip the rest of the spin: they are in Pick with the team already chosen. Spectators may see the landed team a moment before that player’s wheel stops. Accepted for v1.

**Pick:** same post-spin menu and write-ins as This device. Write-ins are stored on the DO in `GameState.customAssets`. The DO rejects the action if the sender is not `currentPlayerId`, phase is not `pick`, or the pick is illegal. After a legal lock, next turn or `revealReady`.

## Reveal and play again

When every roster has 9 picks, all devices show Reveal ready. **Anyone** may tap **Reveal results**. The DO calls the existing reveal Worker **once**, stores the verdict, and broadcasts `scored` or `tied`. A second tap while scoring is ignored; after a failure, retry is allowed.

**Why these records?** and **Tiebreaker** stay per-device UI chrome. The verdict (including champion id) is already on every client after a successful reveal; tapping Why/Tiebreak does not need to sync.

Reveal failure copy stays exactly: `Couldn't score this one — try again.` Rosters stay. Retry does not respin. No partial verdict is stored.

**Play again:** host only. Same room, same players, same turn mode; `playAgain` on the DO. Everyone else gets the reset through the socket.

**Home** in a room = leave. The draft continues for those still connected. The current turn does **not** advance if that player is disconnected.

## Architecture

1. **Pages SPA** — Vite + React. Mode router: local engine vs room snapshot.
2. **Worker** — keep `POST /api/reveal`. Add room HTTP + WebSocket upgrade under `/api/room` (already covered by `run_worker_first: ["/api/*"]`).
3. **Durable Object `Room`** — lobby + `GameState`, WebSocket (hibernation OK). Persist lobby and `GameState` to DO storage after every successful mutation so a sleep or restart does not wipe a mid-draft. Snapshot after every successful action. Destroy the room if the host leaves **during lobby**. Do not expire a draft in progress just because everyone disconnected; reconnect with a seat token still works while the DO storage exists.
4. **League JSON** — unchanged; DO and client use the same file.

Suggested routes:

- `POST /api/room` with `{ name, turnMode }` → `{ code, playerId, seatToken }` (creates the room and the host seat)
- `GET /api/room/:code/ws` → WebSocket

Client messages (names indicative): `hello` (guest: `{ name }`; reconnect: `{ seatToken }`; host reconnect uses the token from POST), `start`, `kick` (lobby only), `spin`, `pick`, `reveal`, `playAgain`, `leave`.  
Server: `snapshot` (full room view for that seat), `error` with the English strings below.

`hello` for a new guest returns `seatToken`. Reconnect with that token restores the seat. The room code alone must not be enough to steal another seat.

Local mode does not open a WebSocket.

## Errors and copy (English)

| Situation | Copy |
|-----------|------|
| Unknown / expired code | `Room not found` |
| Join after Start | `Game already started` |
| 7th player | `Room is full` |
| Host left in lobby | `Host left` |
| Socket drop | `Reconnecting…` (retry; draft stays on the DO) |
| Reveal fail | `Couldn't score this one — try again.` |
| Not your turn / illegal action | Ignore (no state change). Do not crash the room. |
| This device corrupt save | Existing notice; fresh setup. Unrelated to rooms. |

Malformed WS payloads are ignored. A second Spin after the team is already chosen, or Spin/pick from a spectator, is rejected.

## Testing

Keep existing engine, eligibility, turn-order, persist, and Worker-parse tests.

New tests with a fake Room (no live Cloudflare):

- Create + join; Start rejected below 2 and above 6, and rejected from a non-host
- Kick only in lobby; join rejected after Start and at 6
- Spin/pick rejected when not on the clock
- Server RNG: two clients see the same `currentTeamId` after one Spin
- Reveal invoked once; retry after failure allowed
- Reconnect with good token restores seat; bad token does not
- Host leave in lobby destroys the room; host disconnect mid-draft does not skip their turn

Manual: two browser windows — create, join, full 2-player draft, reveal, play again; refresh mid-pick; This device still plays with no room.

## Success

A host can read a 4-character code across the table or send `/r/{code}`. Each person names themselves, drafts on their own phone, sees whose turn it is and which team landed, and gets the same AI records at reveal. This device still works on one laptop with no room.
