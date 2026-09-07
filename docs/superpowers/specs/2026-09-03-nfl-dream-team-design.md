# Dream Team NFL — Design Spec

Date: 2026-09-03  
Status: awaiting user review of this file

## Goal

A same-device party game on Cloudflare: players spin an NFL team wheel, fill a fixed 9-slot dream team, then an AI predicts each roster’s record. Closest to 17–0 wins. UI copy is English. Layout is **desktop-first** (shared computer is the usual table); phone must still work.

## Out of scope

- Online rooms, accounts, or vs-AI opponent
- Live NFL APIs (rosters are a curated JSON in the repo)
- Injuries / IR / “will he play Week 1” — talent only
- Final visual look (colors, wheel art, type). That is a separate pass after this spec, before implementation.

## Players and setup

- 2 to 6 human players (odd counts allowed). Typical table: 4.
- Default names: Player 1, Player 2, … — editable before start.
- Turn order: **round robin** default (1→2→3→1…). Optional **snake** (1→2→3→3→2→1…).
- One shared screen; pass the laptop or sit around it.

## Roster (every player, always)

1. QB  
2. RB  
3. WR  
4. WR  
5. TE  
6. Def Player (one defensive player)  
7. Def (that franchise’s team defense as a unit)  
8. O-line (that franchise’s offensive line as a unit)  
9. Coach  

## League data (JSON)

32 teams. Short menus, 2026 current talent, researched at implementation time (include facts like Aaron Donald’s return to the Rams and Myles Garrett on the Rams). No injury flags.

Per franchise, typical menu:

- QB: 1–2  
- RB: 1–2  
- WR: 2–3  
- TE: 1  
- Def Player: **2–3 best defensive players**  
- Team Defense: 1 unit  
- O-line: 1 unit  
- Coach: 1  

Units (Def, O-line, Coach) are globally unique the same way players are: if Player 1 took Jaguars Coach, nobody else can take that coach.

## Core loop

1. Setup → Start game.  
2. Current player taps **Spin**. Wheel contains **only teams that still have at least one legal fill** for that player’s empty slots.  
3. Team lands. Player picks an **empty** slot and a legal name/unit from that team. Menu hides other people’s taken names and hides slots that are already filled or that this team cannot fill.  
4. Next player (round robin or snake). Repeat until everyone has 9 slots.  
5. **Reveal results** — no scores until this tap.  
6. Scoreboard: each predicted record; **winner large** if records differ.  
7. If two or more share the best record: show the tied records, **no champion yet**, button **Tiebreaker**. Tap → one champion plus one line of why.  
8. **Why these records?** — per roster: short paragraph + Strength / Hole / Player to watch. Hidden until tapped.  
9. **Play again** keeps player count, names, and turn-order mode; clears all picks and scores.

Spin-first, then choose slot (not position-locked before the spin).

## Uniqueness rules

- **Per dream team:** at most **one slot** from a given franchise. If you take Rams Def Player (Donald), you cannot also take Rams team Def, Rams O-line, Rams Coach, or any Rams skill player. The two WR slots must be two different franchises. That franchise then leaves your wheel.  
- **Across the table:** the same franchise may appear on two dream teams. The same player or unit may not.  
- The wheel never lands on an illegal team for the current player (no empty spin, no forced reroll).

## AI verdict

One Worker call at reveal. English. Hybrid, short:

- Predicted record (`13–4`)  
- One short paragraph of why  
- Three lines: Strength, Hole, Player to watch  
- Ranking used for winner / tiebreak  

UI shows records (and winner if unique) first. Explanations wait for **Why these records?** Tiebreak ranking waits for **Tiebreaker** when records tie.

Winner = predicted record closest to 17–0 (most wins). Ties on wins use the AI’s tiebreak, revealed only after the extra button.

If the Worker fails, times out, or returns invalid JSON: keep all rosters, show “Couldn’t score this one — try again.” No fake records. Retry does not respin. If Tiebreaker is missing a champion, retry the Worker; do not silently pick at random.

## Architecture

1. **Cloudflare Pages** — Vite + React SPA. Game state in memory; persist to `localStorage` so refresh does not wipe a mid-game.  
2. **Static JSON** — 32-team menus in the repo. Update by editing and redeploying, not live feeds.  
3. **One Worker** — reveal only. Request: all dream teams. Response: records, tie flag, champion id, explanation blocks.  

No database, no auth, no Durable Objects.

## Client behavior

- One spin at a time; double-tap does not double-spin.  
- Corrupt or missing save → short notice and fresh setup, not a stack trace.  
- If the legal-team set is empty (should not happen with 32 teams): do not spin an empty wheel; show “No legal teams left” and do not invent a pick.

## Testing

**Rules unit tests:** franchise uniqueness per roster; global name uniqueness; wheel filter; post-spin menu; round robin and snake for 2, 3, and 6 players; game ends at 9 picks each.

**Worker tests with fakes:** valid JSON, garbage JSON, timeout; unique winner vs tied records.

**Manual before done:** 2-player happy path on desktop; 3-player snake; refresh mid-game; reveal offline; short phone pass so layout does not break.

## Visual direction — Look D Prime Time (chosen)

Desktop-first. Night stadium canvas, deep navy panels, antique gold metal, chalk-white compressed type, turf-green only as a 1px active accent. Signature layout: giant centered wheel, slim left roster rail, gold broadcast lower-third for turn/status/CTAs.

Reference comps (Cursor assets, not in-repo):
- Wheel: `look-d-prime-time-wheel.png`
- Setup: `look-d-setup.png`
- Pick: `look-d-pick.png`
- Reveal: `look-d-reveal.png`

Do not start coding the product UI until the implementation plan is written. Keep this look through implementation.

## Success

A group of 2–6 people on one computer can finish a full draft and a scored reveal without accounts, and the scoring feels like a short studio desk, not an essay.
