# Dream Team NFL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a same-device NFL dream-team wheel game on Cloudflare Pages: 2–6 players fill a 9-slot roster from a legal-team wheel, then one Worker AI scores records and the closest to 17–0 wins.

**Architecture:** Vite + React SPA holds all game state in memory and `localStorage`. League menus are a static JSON file in the repo. A single Worker (`POST /api/reveal`) calls Workers AI and returns a validated verdict. No auth, no rooms, no database, no Durable Objects.

**Tech Stack:** Vite 6, React 19, TypeScript 5, Vitest, `@cloudflare/vite-plugin`, Wrangler 4, Workers AI `@cf/meta/llama-3.1-8b-instruct`

**Spec:** `docs/superpowers/specs/2026-09-03-nfl-dream-team-design.md`

**Look D comps (read before any UI task):**
- `~/.cursor/projects/Users-bernyvillatoro-Projects-Dream-Team-NFL/assets/look-d-prime-time-wheel.png`
- `~/.cursor/projects/Users-bernyvillatoro-Projects-Dream-Team-NFL/assets/look-d-setup.png`
- `~/.cursor/projects/Users-bernyvillatoro-Projects-Dream-Team-NFL/assets/look-d-pick.png`
- `~/.cursor/projects/Users-bernyvillatoro-Projects-Dream-Team-NFL/assets/look-d-reveal.png`

## Global Constraints

- Same device only. No rooms, accounts, or vs-AI opponent.
- UI copy is English.
- Layout is desktop-first; phone must still work.
- 2 to 6 human players (odd counts allowed). Default names: Player 1, Player 2, … — editable before start.
- Turn order: round robin default (1→2→3→1…). Optional snake (1→2→3→3→2→1…).
- Fixed slots: QB, RB, WR, WR, TE, Def Player, Def, O-line, Coach.
- Per dream team: at most one slot from a given franchise. Two WR slots must be two different franchises.
- Across the table: same franchise may appear on two dream teams. The same player or unit may not.
- The wheel never lands on an illegal team for the current player.
- Spin first, then choose slot.
- Def Player menu: 2–3 best defensive players per franchise.
- No injury flags. 2026 current talent only. Include Aaron Donald’s return to the Rams and Myles Garrett on the Rams.
- Live NFL APIs are out of scope.
- Reveal: records first; explanations wait for **Why these records?**; if records tie, no champion until **Tiebreaker**.
- Winner = predicted record closest to 17–0 (most wins).
- Worker failure copy exactly: `Couldn't score this one — try again.`
- Play again keeps player count, names, and turn-order mode; clears picks and scores.
- Look D Prime Time: night stadium canvas, deep navy panels, antique gold metal, chalk-white compressed type, turf-green only as a 1px active accent. Giant centered wheel, slim left roster rail, gold broadcast lower-third.
- Persist to `localStorage`. Corrupt save → short notice and fresh setup.
- One spin at a time.
- Empty legal-team set: show `No legal teams left` and do not invent a pick.
- Workers AI local: `wrangler dev --remote` is required for real inference. Unit tests must fake the model.

---

## File map

Create these files. Do not invent extra packages or a database.

| Path | Responsibility |
|------|----------------|
| `package.json` | Scripts: `dev`, `build`, `test`, `preview` |
| `vite.config.ts` | React + Cloudflare plugin + Vitest |
| `wrangler.jsonc` | Worker entry, SPA assets, `AI` binding |
| `tsconfig.json` / `tsconfig.app.json` | Strict TS |
| `index.html` | SPA shell, Oswald + Inter fonts |
| `.gitignore` | `node_modules`, `dist`, `.wrangler`, `.dev.vars`, `.superpowers` |
| `src/main.tsx` | React mount |
| `src/league/types.ts` | Shared domain types |
| `src/league/ids.ts` | 32 team ids + `SLOT_DEFS` |
| `src/league/assertLeague.ts` | Machine-checkable league contract |
| `src/data/league.fixture.json` | 6-team test league |
| `src/data/league.json` | Full 32-team 2026 menus (Task 8) |
| `src/game/turnOrder.ts` | `buildTurnOrder` |
| `src/game/eligibility.ts` | Legal teams + post-spin menu |
| `src/game/engine.ts` | Pure game state transitions |
| `src/game/persist.ts` | `localStorage` save/load |
| `src/ai/schema.ts` | Reveal request/response + `Verdict` |
| `src/ai/parseVerdict.ts` | Validate model JSON |
| `src/ai/client.ts` | `fetchReveal` with timeout |
| `worker/index.ts` | `POST /api/reveal` |
| `src/styles/tokens.css` | Look D tokens |
| `src/styles/app.css` | Layout |
| `src/ui/App.tsx` | Phase router + persist |
| `src/ui/RosterRail.tsx` | Left slot list |
| `src/ui/LowerThird.tsx` | Gold broadcast bar |
| `src/ui/Wheel.tsx` | Team wheel |
| `src/ui/SetupScreen.tsx` | Setup |
| `src/ui/SpinScreen.tsx` | Spin |
| `src/ui/PickScreen.tsx` | Post-spin menu |
| `src/ui/RevealScreen.tsx` | Scores / tiebreak / why |
| `src/game/*.test.ts` | Rule tests |
| `src/ai/parseVerdict.test.ts` | Verdict tests |
| `src/league/assertLeague.test.ts` | League contract tests |

---

### Task 1: Scaffold + turn order

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `wrangler.jsonc`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`
- Create: `src/league/types.ts`
- Create: `src/game/turnOrder.ts`
- Test: `src/game/turnOrder.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `TurnMode`, `PlayerSetup`, `buildTurnOrder(playerIds: string[], mode: TurnMode, picksEach?: number): string[]`

- [ ] **Step 1: Write the failing test**

Create `src/game/turnOrder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildTurnOrder } from "./turnOrder";

describe("buildTurnOrder", () => {
  it("round robin 3 players × 9 picks", () => {
    const order = buildTurnOrder(["p0", "p1", "p2"], "roundRobin", 9);
    expect(order).toHaveLength(27);
    expect(order.slice(0, 6)).toEqual(["p0", "p1", "p2", "p0", "p1", "p2"]);
    expect(order[26]).toBe("p2");
  });

  it("snake 3 players × 9 picks doubles the last player at the turn", () => {
    const order = buildTurnOrder(["p0", "p1", "p2"], "snake", 9);
    expect(order).toHaveLength(27);
    expect(order.slice(0, 9)).toEqual([
      "p0", "p1", "p2",
      "p2", "p1", "p0",
      "p0", "p1", "p2",
    ]);
  });

  it("snake 2 players alternates pairs", () => {
    expect(buildTurnOrder(["p0", "p1"], "snake", 4)).toEqual([
      "p0", "p1", "p1", "p0", "p0", "p1", "p1", "p0",
    ]);
  });

  it("round robin 6 players × 9 picks", () => {
    const ids = ["p0", "p1", "p2", "p3", "p4", "p5"];
    const order = buildTurnOrder(ids, "roundRobin", 9);
    expect(order).toHaveLength(54);
    expect(order.slice(0, 6)).toEqual(ids);
    expect(order.slice(6, 12)).toEqual(ids);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/bernyvillatoro/Projects/Dream Team NFL"
npm init -y
npm install react react-dom
npm install -D typescript vite @vitejs/plugin-react vitest @cloudflare/vite-plugin wrangler @types/react @types/react-dom
npx vitest run src/game/turnOrder.test.ts
```

Expected: FAIL — `Cannot find module './turnOrder'`

- [ ] **Step 3: Write scaffold + minimal implementation**

`package.json` scripts (keep existing name; add):

```json
{
  "name": "dream-team-nfl",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "cf:dev": "wrangler dev --remote"
  }
}
```

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  test: {
    environment: "node",
  },
});
```

`wrangler.jsonc`:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "dream-team-nfl",
  "main": "worker/index.ts",
  "compatibility_date": "2026-09-03",
  "assets": {
    "not_found_handling": "single-page-application"
  },
  "ai": {
    "binding": "AI"
  }
}
```

`tsconfig.json`:

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }]
}
```

`tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "worker"]
}
```

`.gitignore`:

```
node_modules
dist
.wrangler
.dev.vars
.superpowers
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dream Team</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`src/main.tsx`:

```tsx
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(<p>Dream Team</p>);
```

`src/league/types.ts`:

```ts
export type SlotId =
  | "qb"
  | "rb"
  | "wr1"
  | "wr2"
  | "te"
  | "defPlayer"
  | "def"
  | "oline"
  | "coach";

export type MenuGroup =
  | "qb"
  | "rb"
  | "wr"
  | "te"
  | "defPlayer"
  | "def"
  | "oline"
  | "coach";

export type AssetKind = "player" | "unit";

export type TurnMode = "roundRobin" | "snake";

export type PlayerSetup = {
  id: string;
  name: string;
};

export type LeagueAsset = {
  id: string;
  name: string;
  kind: AssetKind;
  group: MenuGroup;
  teamId: string;
};

export type LeagueTeam = {
  id: string;
  abbr: string;
  name: string;
  city: string;
  assets: LeagueAsset[];
};

export type League = {
  season: 2026;
  teams: LeagueTeam[];
};

export type Pick = {
  slotId: SlotId;
  assetId: string;
  teamId: string;
};

export type DreamTeam = {
  playerId: string;
  name: string;
  picks: Pick[];
};
```

`src/game/turnOrder.ts`:

```ts
import type { TurnMode } from "../league/types";

export function buildTurnOrder(
  playerIds: string[],
  mode: TurnMode,
  picksEach: number = 9,
): string[] {
  const order: string[] = [];
  const n = playerIds.length;
  for (let round = 0; round < picksEach; round++) {
    const forward = mode === "roundRobin" || round % 2 === 0;
    if (forward) {
      for (let i = 0; i < n; i++) order.push(playerIds[i]);
    } else {
      for (let i = n - 1; i >= 0; i--) order.push(playerIds[i]);
    }
  }
  return order;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/game/turnOrder.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git init
git add package.json package-lock.json vite.config.ts wrangler.jsonc tsconfig.json tsconfig.app.json index.html .gitignore src/main.tsx src/vite-env.d.ts src/league/types.ts src/game/turnOrder.ts src/game/turnOrder.test.ts
git commit -m "feat: scaffold app and turn-order rules"
```

---

### Task 2: League ids + fixture + eligibility

**Files:**
- Create: `src/league/ids.ts`
- Create: `src/data/league.fixture.json`
- Create: `src/game/eligibility.ts`
- Test: `src/game/eligibility.test.ts`

**Interfaces:**
- Consumes: `League`, `LeagueTeam`, `LeagueAsset`, `DreamTeam`, `SlotId`, `MenuGroup` from `src/league/types.ts`
- Produces:
  - `TEAM_IDS` (32 strings)
  - `SLOT_DEFS: { id: SlotId; group: MenuGroup; label: string }[]`
  - `emptySlots(dreamTeam: DreamTeam): SlotId[]`
  - `assetFitsSlot(asset: LeagueAsset, slotId: SlotId): boolean`
  - `legalTeamsForPlayer(league: League, dreamTeam: DreamTeam, takenAssetIds: string[]): LeagueTeam[]`
  - `legalMenu(league: League, dreamTeam: DreamTeam, takenAssetIds: string[], teamId: string): LeagueAsset[]`

- [ ] **Step 1: Write the failing test**

`src/game/eligibility.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DreamTeam, League } from "../league/types";
import {
  emptySlots,
  legalMenu,
  legalTeamsForPlayer,
} from "./eligibility";

const league = JSON.parse(
  readFileSync("src/data/league.fixture.json", "utf8"),
) as League;

const emptyBerny: DreamTeam = { playerId: "p0", name: "Berny", picks: [] };

describe("eligibility", () => {
  it("empty roster has 9 empty slots", () => {
    expect(emptySlots(emptyBerny)).toHaveLength(9);
  });

  it("does not offer a franchise already on this dream team", () => {
    const berny: DreamTeam = {
      playerId: "p0",
      name: "Berny",
      picks: [{ slotId: "qb", assetId: "min-qb-jj-mccarthy", teamId: "min" }],
    };
    const ids = legalTeamsForPlayer(league, berny, []).map((t) => t.id);
    expect(ids).not.toContain("min");
    expect(ids).toContain("lar");
  });

  it("hides globally taken assets but still allows the franchise for someone else", () => {
    const andres: DreamTeam = { playerId: "p1", name: "Andres", picks: [] };
    const menu = legalMenu(league, andres, ["min-wr-justin-jefferson"], "min");
    expect(menu.map((a) => a.id)).not.toContain("min-wr-justin-jefferson");
    expect(menu.map((a) => a.id)).toContain("min-wr-jordan-addison");
  });

  it("does not list a group whose slots are already filled", () => {
    const berny: DreamTeam = {
      playerId: "p0",
      name: "Berny",
      picks: [
        { slotId: "wr1", assetId: "kc-wr-worthy", teamId: "kc" },
        { slotId: "wr2", assetId: "chi-wr-rome", teamId: "chi" },
      ],
    };
    const menu = legalMenu(league, berny, [], "min");
    expect(menu.every((a) => a.group !== "wr")).toBe(true);
  });

  it("drops a team with nothing legal left for remaining slots", () => {
    const berny: DreamTeam = {
      playerId: "p0",
      name: "Berny",
      picks: [
        { slotId: "qb", assetId: "kc-qb-mahomes", teamId: "kc" },
        { slotId: "rb", assetId: "atl-rb-bijan", teamId: "atl" },
        { slotId: "wr1", assetId: "chi-wr-rome", teamId: "chi" },
        { slotId: "wr2", assetId: "jax-wr-btj", teamId: "jax" },
        { slotId: "te", assetId: "lar-te-higbee", teamId: "lar" },
        { slotId: "defPlayer", assetId: "lar-defplayer-aaron-donald", teamId: "lar" },
        { slotId: "def", assetId: "chi-def-unit", teamId: "chi" },
        { slotId: "oline", assetId: "kc-oline-unit", teamId: "kc" },
      ],
    };
    const taken = ["min-coach-oconnell"];
    const ids = legalTeamsForPlayer(league, berny, taken).map((t) => t.id);
    expect(ids).not.toContain("min");
    expect(ids).toContain("jax");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/game/eligibility.test.ts
```

Expected: FAIL — missing module or missing fixture

- [ ] **Step 3: Write ids, fixture, eligibility**

`src/league/ids.ts`:

```ts
import type { MenuGroup, SlotId } from "./types";

export const TEAM_IDS = [
  "ari", "atl", "bal", "buf", "car", "chi", "cin", "cle",
  "dal", "den", "det", "gb", "hou", "ind", "jax", "kc",
  "lv", "lac", "lar", "mia", "min", "ne", "no", "nyg",
  "nyj", "phi", "pit", "sea", "sf", "tb", "ten", "was",
] as const;

export const SLOT_DEFS: { id: SlotId; group: MenuGroup; label: string }[] = [
  { id: "qb", group: "qb", label: "QB" },
  { id: "rb", group: "rb", label: "RB" },
  { id: "wr1", group: "wr", label: "WR" },
  { id: "wr2", group: "wr", label: "WR" },
  { id: "te", group: "te", label: "TE" },
  { id: "defPlayer", group: "defPlayer", label: "DEF PLAYER" },
  { id: "def", group: "def", label: "DEF" },
  { id: "oline", group: "oline", label: "O-LINE" },
  { id: "coach", group: "coach", label: "COACH" },
];
```

`src/data/league.fixture.json` (exactly these 6 teams; used only in tests):

```json
{
  "season": 2026,
  "teams": [
    {
      "id": "min",
      "abbr": "MIN",
      "name": "Minnesota Vikings",
      "city": "Minnesota",
      "assets": [
        { "id": "min-qb-jj-mccarthy", "name": "J.J. McCarthy", "kind": "player", "group": "qb", "teamId": "min" },
        { "id": "min-rb-aaron-jones", "name": "Aaron Jones", "kind": "player", "group": "rb", "teamId": "min" },
        { "id": "min-wr-justin-jefferson", "name": "Justin Jefferson", "kind": "player", "group": "wr", "teamId": "min" },
        { "id": "min-wr-jordan-addison", "name": "Jordan Addison", "kind": "player", "group": "wr", "teamId": "min" },
        { "id": "min-te-tj-hockenson", "name": "T.J. Hockenson", "kind": "player", "group": "te", "teamId": "min" },
        { "id": "min-defplayer-harrison-smith", "name": "Harrison Smith", "kind": "player", "group": "defPlayer", "teamId": "min" },
        { "id": "min-defplayer-andrew-van-ginkel", "name": "Andrew Van Ginkel", "kind": "player", "group": "defPlayer", "teamId": "min" },
        { "id": "min-def-unit", "name": "Vikings Defense", "kind": "unit", "group": "def", "teamId": "min" },
        { "id": "min-oline-unit", "name": "Vikings O-line", "kind": "unit", "group": "oline", "teamId": "min" },
        { "id": "min-coach-oconnell", "name": "Kevin O'Connell", "kind": "unit", "group": "coach", "teamId": "min" }
      ]
    },
    {
      "id": "kc",
      "abbr": "KC",
      "name": "Kansas City Chiefs",
      "city": "Kansas City",
      "assets": [
        { "id": "kc-qb-mahomes", "name": "Patrick Mahomes", "kind": "player", "group": "qb", "teamId": "kc" },
        { "id": "kc-rb-pacheco", "name": "Isiah Pacheco", "kind": "player", "group": "rb", "teamId": "kc" },
        { "id": "kc-wr-worthy", "name": "Xavier Worthy", "kind": "player", "group": "wr", "teamId": "kc" },
        { "id": "kc-wr-rice", "name": "Rashee Rice", "kind": "player", "group": "wr", "teamId": "kc" },
        { "id": "kc-te-kelce", "name": "Travis Kelce", "kind": "player", "group": "te", "teamId": "kc" },
        { "id": "kc-defplayer-chris-jones", "name": "Chris Jones", "kind": "player", "group": "defPlayer", "teamId": "kc" },
        { "id": "kc-defplayer-trent-mcduffie", "name": "Trent McDuffie", "kind": "player", "group": "defPlayer", "teamId": "kc" },
        { "id": "kc-def-unit", "name": "Chiefs Defense", "kind": "unit", "group": "def", "teamId": "kc" },
        { "id": "kc-oline-unit", "name": "Chiefs O-line", "kind": "unit", "group": "oline", "teamId": "kc" },
        { "id": "kc-coach-reid", "name": "Andy Reid", "kind": "unit", "group": "coach", "teamId": "kc" }
      ]
    },
    {
      "id": "lar",
      "abbr": "LAR",
      "name": "Los Angeles Rams",
      "city": "Los Angeles",
      "assets": [
        { "id": "lar-qb-stafford", "name": "Matthew Stafford", "kind": "player", "group": "qb", "teamId": "lar" },
        { "id": "lar-rb-kyren", "name": "Kyren Williams", "kind": "player", "group": "rb", "teamId": "lar" },
        { "id": "lar-wr-puka", "name": "Puka Nacua", "kind": "player", "group": "wr", "teamId": "lar" },
        { "id": "lar-wr-adams", "name": "Davante Adams", "kind": "player", "group": "wr", "teamId": "lar" },
        { "id": "lar-te-higbee", "name": "Tyler Higbee", "kind": "player", "group": "te", "teamId": "lar" },
        { "id": "lar-defplayer-aaron-donald", "name": "Aaron Donald", "kind": "player", "group": "defPlayer", "teamId": "lar" },
        { "id": "lar-defplayer-myles-garrett", "name": "Myles Garrett", "kind": "player", "group": "defPlayer", "teamId": "lar" },
        { "id": "lar-defplayer-kobie-turner", "name": "Kobie Turner", "kind": "player", "group": "defPlayer", "teamId": "lar" },
        { "id": "lar-def-unit", "name": "Rams Defense", "kind": "unit", "group": "def", "teamId": "lar" },
        { "id": "lar-oline-unit", "name": "Rams O-line", "kind": "unit", "group": "oline", "teamId": "lar" },
        { "id": "lar-coach-mcvay", "name": "Sean McVay", "kind": "unit", "group": "coach", "teamId": "lar" }
      ]
    },
    {
      "id": "chi",
      "abbr": "CHI",
      "name": "Chicago Bears",
      "city": "Chicago",
      "assets": [
        { "id": "chi-qb-caleb", "name": "Caleb Williams", "kind": "player", "group": "qb", "teamId": "chi" },
        { "id": "chi-rb-swift", "name": "D'Andre Swift", "kind": "player", "group": "rb", "teamId": "chi" },
        { "id": "chi-wr-rome", "name": "Rome Odunze", "kind": "player", "group": "wr", "teamId": "chi" },
        { "id": "chi-wr-moore", "name": "DJ Moore", "kind": "player", "group": "wr", "teamId": "chi" },
        { "id": "chi-te-kmet", "name": "Cole Kmet", "kind": "player", "group": "te", "teamId": "chi" },
        { "id": "chi-defplayer-sweat", "name": "Montez Sweat", "kind": "player", "group": "defPlayer", "teamId": "chi" },
        { "id": "chi-defplayer-brisker", "name": "Jaquan Brisker", "kind": "player", "group": "defPlayer", "teamId": "chi" },
        { "id": "chi-def-unit", "name": "Bears Defense", "kind": "unit", "group": "def", "teamId": "chi" },
        { "id": "chi-oline-unit", "name": "Bears O-line", "kind": "unit", "group": "oline", "teamId": "chi" },
        { "id": "chi-coach-eberflus", "name": "Ben Johnson", "kind": "unit", "group": "coach", "teamId": "chi" }
      ]
    },
    {
      "id": "atl",
      "abbr": "ATL",
      "name": "Atlanta Falcons",
      "city": "Atlanta",
      "assets": [
        { "id": "atl-qb-penix", "name": "Michael Penix Jr.", "kind": "player", "group": "qb", "teamId": "atl" },
        { "id": "atl-rb-bijan", "name": "Bijan Robinson", "kind": "player", "group": "rb", "teamId": "atl" },
        { "id": "atl-wr-london", "name": "Drake London", "kind": "player", "group": "wr", "teamId": "atl" },
        { "id": "atl-wr-mooney", "name": "Darnell Mooney", "kind": "player", "group": "wr", "teamId": "atl" },
        { "id": "atl-te-pitts", "name": "Kyle Pitts", "kind": "player", "group": "te", "teamId": "atl" },
        { "id": "atl-defplayer-grady", "name": "Grady Jarrett", "kind": "player", "group": "defPlayer", "teamId": "atl" },
        { "id": "atl-defplayer-aj-terrell", "name": "A.J. Terrell", "kind": "player", "group": "defPlayer", "teamId": "atl" },
        { "id": "atl-def-unit", "name": "Falcons Defense", "kind": "unit", "group": "def", "teamId": "atl" },
        { "id": "atl-oline-unit", "name": "Falcons O-line", "kind": "unit", "group": "oline", "teamId": "atl" },
        { "id": "atl-coach-morris", "name": "Raheem Morris", "kind": "unit", "group": "coach", "teamId": "atl" }
      ]
    },
    {
      "id": "jax",
      "abbr": "JAX",
      "name": "Jacksonville Jaguars",
      "city": "Jacksonville",
      "assets": [
        { "id": "jax-qb-lawrence", "name": "Trevor Lawrence", "kind": "player", "group": "qb", "teamId": "jax" },
        { "id": "jax-rb-etienne", "name": "Travis Etienne", "kind": "player", "group": "rb", "teamId": "jax" },
        { "id": "jax-wr-btj", "name": "Brian Thomas Jr.", "kind": "player", "group": "wr", "teamId": "jax" },
        { "id": "jax-wr-kirk", "name": "Christian Kirk", "kind": "player", "group": "wr", "teamId": "jax" },
        { "id": "jax-te-strange", "name": "Brenton Strange", "kind": "player", "group": "te", "teamId": "jax" },
        { "id": "jax-defplayer-hutchinson", "name": "Josh Hines-Allen", "kind": "player", "group": "defPlayer", "teamId": "jax" },
        { "id": "jax-defplayer-lloyd", "name": "Devin Lloyd", "kind": "player", "group": "defPlayer", "teamId": "jax" },
        { "id": "jax-def-unit", "name": "Jaguars Defense", "kind": "unit", "group": "def", "teamId": "jax" },
        { "id": "jax-oline-unit", "name": "Jaguars O-line", "kind": "unit", "group": "oline", "teamId": "jax" },
        { "id": "jax-coach-coen", "name": "Liam Coen", "kind": "unit", "group": "coach", "teamId": "jax" }
      ]
    }
  ]
}
```

`src/game/eligibility.ts`:

```ts
import { SLOT_DEFS } from "../league/ids";
import type { DreamTeam, League, LeagueAsset, LeagueTeam, SlotId } from "../league/types";

export function emptySlots(dreamTeam: DreamTeam): SlotId[] {
  const filled = new Set(dreamTeam.picks.map((p) => p.slotId));
  return SLOT_DEFS.filter((s) => !filled.has(s.id)).map((s) => s.id);
}

export function assetFitsSlot(asset: LeagueAsset, slotId: SlotId): boolean {
  const def = SLOT_DEFS.find((s) => s.id === slotId);
  return def !== undefined && def.group === asset.group;
}

export function legalMenu(
  league: League,
  dreamTeam: DreamTeam,
  takenAssetIds: string[],
  teamId: string,
): LeagueAsset[] {
  const team = league.teams.find((t) => t.id === teamId);
  if (!team) return [];
  if (dreamTeam.picks.some((p) => p.teamId === teamId)) return [];
  const taken = new Set(takenAssetIds);
  const open = emptySlots(dreamTeam);
  return team.assets.filter((asset) => {
    if (taken.has(asset.id)) return false;
    return open.some((slot) => assetFitsSlot(asset, slot));
  });
}

export function legalTeamsForPlayer(
  league: League,
  dreamTeam: DreamTeam,
  takenAssetIds: string[],
): LeagueTeam[] {
  return league.teams.filter(
    (team) => legalMenu(league, dreamTeam, takenAssetIds, team.id).length > 0,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/game/eligibility.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/league/ids.ts src/data/league.fixture.json src/game/eligibility.ts src/game/eligibility.test.ts
git commit -m "feat: add legal-team and post-spin menu rules"
```

---

### Task 3: Game engine

**Files:**
- Create: `src/game/engine.ts`
- Test: `src/game/engine.test.ts`

**Interfaces:**
- Consumes: `buildTurnOrder`, `legalTeamsForPlayer`, `legalMenu`, `assetFitsSlot`, `emptySlots`, types from `src/league/types.ts`
- Produces:
  - `GamePhase = "spin" | "pick" | "revealReady" | "scored" | "tied"`
  - `GameState` (see code)
  - `createSetupDefaults(count: number): PlayerSetup[]`
  - `startGame(players: PlayerSetup[], turnMode: TurnMode): GameState`
  - `beginSpin(state: GameState): GameState`
  - `completeSpin(state: GameState, league: League, rng: () => number): GameState`
  - `lockPick(state: GameState, league: League, assetId: string, slotId: SlotId): GameState`
  - `playAgain(state: GameState): GameState`
  - `applyVerdict(state: GameState, verdict: Verdict): GameState`
  - `currentPlayerId(state: GameState): string`
  - `dreamTeamOf(state: GameState, playerId: string): DreamTeam`

`Verdict` lives in `src/ai/schema.ts` created in this task so `applyVerdict` type-checks:

```ts
export type SlotVerdict = {
  playerId: string;
  record: string;
  wins: number;
  paragraph: string;
  strength: string;
  hole: string;
  playerToWatch: string;
};

export type Verdict = {
  records: SlotVerdict[];
  championPlayerId: string;
  recordsTied: boolean;
  tiebreakLine: string;
};
```

- [ ] **Step 1: Write the failing test**

`src/game/engine.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { League } from "../league/types";
import {
  applyVerdict,
  beginSpin,
  completeSpin,
  createSetupDefaults,
  currentPlayerId,
  lockPick,
  playAgain,
  startGame,
} from "./engine";

const league = JSON.parse(
  readFileSync("src/data/league.fixture.json", "utf8"),
) as League;

function rngWant(state: import("./engine").GameState, teamId: string) {
  return () => {
    const { legalTeamsForPlayer } = require("./eligibility") as typeof import("./eligibility");
    const { currentPlayerId, dreamTeamOf } = require("./engine") as typeof import("./engine");
    const legal = legalTeamsForPlayer(
      league,
      dreamTeamOf(state, currentPlayerId(state)),
      state.takenAssetIds,
    );
    const idx = legal.findIndex((t: { id: string }) => t.id === teamId);
    if (idx < 0) return 0;
    return (idx + 0.01) / legal.length;
  };
}

describe("engine", () => {
  it("defaults Player 1..N and rejects counts outside 2–6", () => {
    expect(createSetupDefaults(4).map((p) => p.name)).toEqual([
      "Player 1", "Player 2", "Player 3", "Player 4",
    ]);
    expect(() => createSetupDefaults(1)).toThrow();
    expect(() => createSetupDefaults(7)).toThrow();
  });

  it("starts on spin for player 0; game ends after 9 picks each", () => {
    const players = createSetupDefaults(2);
    let state = startGame(players, "roundRobin");
    expect(state.phase).toBe("spin");
    expect(currentPlayerId(state)).toBe("p0");
    expect(state.turnOrder).toHaveLength(18);
  });

  it("ignores a second beginSpin while spinning", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = beginSpin(state);
    const mid = beginSpin(state);
    expect(mid.spinning).toBe(true);
    expect(mid).toEqual(state);
  });

  it("lands only on a legal team", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    expect(state.phase).toBe("pick");
    expect(state.currentTeamId).toBe("min");
  });

  it("lockPick records franchise + asset and advances turn", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    state = lockPick(state, league, "min-wr-justin-jefferson", "wr1");
    expect(state.dreamTeams[0].picks[0]).toEqual({
      slotId: "wr1",
      assetId: "min-wr-justin-jefferson",
      teamId: "min",
    });
    expect(state.takenAssetIds).toContain("min-wr-justin-jefferson");
    expect(currentPlayerId(state)).toBe("p1");
    expect(state.phase).toBe("spin");
    expect(state.currentTeamId).toBeNull();
  });

  it("rejects locking a second asset from the same franchise on one roster", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    state = lockPick(state, league, "min-wr-justin-jefferson", "wr1");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "kc"));
    state = lockPick(state, league, "kc-qb-mahomes", "qb");
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    const before = state;
    const after = lockPick(state, league, "min-qb-jj-mccarthy", "qb");
    expect(after).toEqual(before);
  });

  it("moves to revealReady after 9 picks each", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    const p0Teams = ["min", "kc", "lar", "chi", "atl", "jax", "min", "kc", "lar"];
    const p1Teams = ["kc", "lar", "chi", "atl", "jax", "min", "kc", "lar", "chi"];
    const p0Slots = ["wr1", "qb", "rb", "te", "wr2", "defPlayer", "def", "oline", "coach"] as const;
    const p1Slots = ["qb", "rb", "wr1", "te", "wr2", "def", "oline", "coach", "defPlayer"] as const;
    const p0Assets = [
      "min-wr-justin-jefferson", "kc-qb-mahomes", "lar-rb-kyren", "chi-te-kmet",
      "atl-wr-london", "jax-defplayer-hutchinson", "min-def-unit", "kc-oline-unit",
      "lar-coach-mcvay",
    ];
    const p1Assets = [
      "kc-wr-worthy", "lar-qb-stafford", "chi-rb-swift", "atl-te-pitts",
      "jax-wr-btj", "min-defplayer-harrison-smith", "kc-def-unit", "lar-oline-unit",
      "chi-coach-eberflus",
    ];
    for (let i = 0; i < 9; i++) {
      state = beginSpin(state);
      state = completeSpin(state, league, rngWant(state, p0Teams[i]));
      state = lockPick(state, league, p0Assets[i], p0Slots[i]);
      state = beginSpin(state);
      state = completeSpin(state, league, rngWant(state, p1Teams[i]));
      state = lockPick(state, league, p1Assets[i], p1Slots[i]);
    }
    expect(state.phase).toBe("revealReady");
    expect(state.dreamTeams[0].picks).toHaveLength(9);
    expect(state.dreamTeams[1].picks).toHaveLength(9);
  });

  it("playAgain keeps names and mode, clears picks", () => {
    let state = startGame(
      [{ id: "p0", name: "Berny" }, { id: "p1", name: "Andres" }],
      "snake",
    );
    state = beginSpin(state);
    state = completeSpin(state, league, rngWant(state, "min"));
    state = lockPick(state, league, "min-wr-justin-jefferson", "wr1");
    state = playAgain(state);
    expect(state.players[0].name).toBe("Berny");
    expect(state.turnMode).toBe("snake");
    expect(state.dreamTeams[0].picks).toEqual([]);
    expect(state.phase).toBe("spin");
    expect(state.verdict).toBeNull();
  });

  it("applyVerdict unique winner → scored; tied records → tied", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    state = { ...state, phase: "revealReady" };
    const unique = applyVerdict(state, {
      records: [
        { playerId: "p0", record: "13–4", wins: 13, paragraph: "a", strength: "s", hole: "h", playerToWatch: "x" },
        { playerId: "p1", record: "15–2", wins: 15, paragraph: "b", strength: "s", hole: "h", playerToWatch: "y" },
      ],
      championPlayerId: "p1",
      recordsTied: false,
      tiebreakLine: "",
    });
    expect(unique.phase).toBe("scored");
    const tied = applyVerdict(state, {
      records: [
        { playerId: "p0", record: "14–3", wins: 14, paragraph: "a", strength: "s", hole: "h", playerToWatch: "x" },
        { playerId: "p1", record: "14–3", wins: 14, paragraph: "b", strength: "s", hole: "h", playerToWatch: "y" },
      ],
      championPlayerId: "p0",
      recordsTied: true,
      tiebreakLine: "Better QB room",
    });
    expect(tied.phase).toBe("tied");
  });

  it("completeSpin with no legal teams sets emptyLegal and stays on spin", () => {
    let state = startGame(createSetupDefaults(2), "roundRobin");
    const barren: League = { season: 2026, teams: [] };
    state = beginSpin(state);
    state = completeSpin(state, barren, () => 0);
    expect(state.phase).toBe("spin");
    expect(state.spinning).toBe(false);
    expect(state.emptyLegal).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/game/engine.test.ts
```

Expected: FAIL — `Cannot find module './engine'`

- [ ] **Step 3: Write schema stub + engine**

Create `src/ai/schema.ts` with the `SlotVerdict` and `Verdict` types shown in Interfaces.

`src/game/engine.ts`:

```ts
import type { Verdict } from "../ai/schema";
import type { DreamTeam, League, PlayerSetup, SlotId, TurnMode } from "../league/types";
import { assetFitsSlot, legalMenu, legalTeamsForPlayer } from "./eligibility";
import { buildTurnOrder } from "./turnOrder";

export type GamePhase =
  | "spin"
  | "pick"
  | "revealReady"
  | "scored"
  | "tied";

export type GameState = {
  players: PlayerSetup[];
  turnMode: TurnMode;
  turnIndex: number;
  turnOrder: string[];
  dreamTeams: DreamTeam[];
  takenAssetIds: string[];
  currentTeamId: string | null;
  spinning: boolean;
  phase: GamePhase;
  verdict: Verdict | null;
  emptyLegal: boolean;
  saveNotice: "none" | "corrupt";
};

export function createSetupDefaults(count: number): PlayerSetup[] {
  if (count < 2 || count > 6) throw new Error("Player count must be 2-6");
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
  }));
}

export function currentPlayerId(state: GameState): string {
  return state.turnOrder[state.turnIndex];
}

export function dreamTeamOf(state: GameState, playerId: string): DreamTeam {
  const dt = state.dreamTeams.find((d) => d.playerId === playerId);
  if (!dt) throw new Error(`Missing dream team ${playerId}`);
  return dt;
}

export function startGame(players: PlayerSetup[], turnMode: TurnMode): GameState {
  return {
    players,
    turnMode,
    turnIndex: 0,
    turnOrder: buildTurnOrder(players.map((p) => p.id), turnMode, 9),
    dreamTeams: players.map((p) => ({ playerId: p.id, name: p.name, picks: [] })),
    takenAssetIds: [],
    currentTeamId: null,
    spinning: false,
    phase: "spin",
    verdict: null,
    emptyLegal: false,
    saveNotice: "none",
  };
}

export function beginSpin(state: GameState): GameState {
  if (state.phase !== "spin" || state.spinning) return state;
  return { ...state, spinning: true, emptyLegal: false };
}

export function completeSpin(
  state: GameState,
  league: League,
  rng: () => number,
): GameState {
  if (!state.spinning) return state;
  const playerId = currentPlayerId(state);
  const legal = legalTeamsForPlayer(league, dreamTeamOf(state, playerId), state.takenAssetIds);
  if (legal.length === 0) {
    return { ...state, spinning: false, emptyLegal: true, currentTeamId: null, phase: "spin" };
  }
  const idx = Math.min(legal.length - 1, Math.floor(rng() * legal.length));
  return {
    ...state,
    spinning: false,
    emptyLegal: false,
    currentTeamId: legal[idx].id,
    phase: "pick",
  };
}

export function lockPick(
  state: GameState,
  league: League,
  assetId: string,
  slotId: SlotId,
): GameState {
  if (state.phase !== "pick" || !state.currentTeamId) return state;
  const playerId = currentPlayerId(state);
  const dt = dreamTeamOf(state, playerId);
  const menu = legalMenu(league, dt, state.takenAssetIds, state.currentTeamId);
  const asset = menu.find((a) => a.id === assetId);
  if (!asset) return state;
  if (!assetFitsSlot(asset, slotId)) return state;
  if (dt.picks.some((p) => p.slotId === slotId || p.teamId === asset.teamId)) return state;
  const nextTeams = state.dreamTeams.map((team) =>
    team.playerId === playerId
      ? { ...team, picks: [...team.picks, { slotId, assetId, teamId: asset.teamId }] }
      : team,
  );
  const nextIndex = state.turnIndex + 1;
  const done = nextIndex >= state.turnOrder.length;
  return {
    ...state,
    dreamTeams: nextTeams,
    takenAssetIds: [...state.takenAssetIds, assetId],
    currentTeamId: null,
    turnIndex: done ? state.turnIndex : nextIndex,
    phase: done ? "revealReady" : "spin",
    spinning: false,
  };
}

export function playAgain(state: GameState): GameState {
  return startGame(state.players, state.turnMode);
}

export function applyVerdict(state: GameState, verdict: Verdict): GameState {
  return {
    ...state,
    verdict,
    phase: verdict.recordsTied ? "tied" : "scored",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/game/engine.test.ts src/game/turnOrder.test.ts src/game/eligibility.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai/schema.ts src/game/engine.ts src/game/engine.test.ts
git commit -m "feat: add pure game engine for spin, lock, and reveal phases"
```

---

### Task 4: Persist + parseVerdict + fetch client

**Files:**
- Create: `src/game/persist.ts`
- Create: `src/ai/parseVerdict.ts`
- Create: `src/ai/client.ts`
- Test: `src/game/persist.test.ts`
- Test: `src/ai/parseVerdict.test.ts`

**Interfaces:**
- Consumes: `GameState` from `src/game/engine.ts`; `Verdict` from `src/ai/schema.ts`
- Produces:
  - `STORAGE_KEY = "dream-team-nfl-v1"`
  - `saveGame(state: GameState, storage?: Storage): void`
  - `loadGame(storage?: Storage): LoadResult` where `LoadResult = { ok: true; state: GameState } | { ok: false; notice: "corrupt" | "missing" }`
  - `parseVerdict(raw: unknown, playerIds: string[]): Verdict`
  - `fetchReveal(dreamTeams: DreamTeam[], league: League, signal?: AbortSignal): Promise<{ ok: true; verdict: Verdict } | { ok: false }>`
  - `SCORE_ERROR = "Couldn't score this one — try again."`

- [ ] **Step 1: Write the failing tests**

`src/game/persist.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { startGame } from "./engine";
import { loadGame, saveGame } from "./persist";

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

  it("corrupt JSON returns notice corrupt", () => {
    const storage = memoryStorage();
    storage.setItem("dream-team-nfl-v1", "{not-json");
    expect(loadGame(storage)).toEqual({ ok: false, notice: "corrupt" });
  });
});
```

`src/ai/parseVerdict.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseVerdict } from "./parseVerdict";

const players = ["p0", "p1"];

const good = {
  records: [
    { playerId: "p0", wins: 13, paragraph: "Why A", strength: "WRs", hole: "QB", playerToWatch: "Bijan" },
    { playerId: "p1", wins: 15, paragraph: "Why B", strength: "QB", hole: "WR1", playerToWatch: "Mahomes" },
  ],
  championPlayerId: "p1",
  tiebreakLine: "QB gap",
};

describe("parseVerdict", () => {
  it("accepts valid unique-winner payload", () => {
    const v = parseVerdict(good, players);
    expect(v.records[0].record).toBe("13–4");
    expect(v.recordsTied).toBe(false);
    expect(v.championPlayerId).toBe("p1");
  });

  it("flags tied wins even if champion is set", () => {
    const tied = {
      records: [
        { playerId: "p0", wins: 14, paragraph: "a", strength: "s", hole: "h", playerToWatch: "x" },
        { playerId: "p1", wins: 14, paragraph: "b", strength: "s", hole: "h", playerToWatch: "y" },
      ],
      championPlayerId: "p0",
      tiebreakLine: "Better QB",
    };
    expect(parseVerdict(tied, players).recordsTied).toBe(true);
  });

  it("throws on garbage, missing player, wins out of range, unknown champion", () => {
    expect(() => parseVerdict("nope", players)).toThrow();
    expect(() => parseVerdict({ ...good, records: [good.records[0]] }, players)).toThrow();
    expect(() => parseVerdict({
      ...good,
      records: [{ ...good.records[0], wins: 18 }, good.records[1]],
    }, players)).toThrow();
    expect(() => parseVerdict({ ...good, championPlayerId: "p9" }, players)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/game/persist.test.ts src/ai/parseVerdict.test.ts
```

Expected: FAIL — modules missing

- [ ] **Step 3: Implement persist, parseVerdict, client**

`src/game/persist.ts`:

```ts
import type { GameState } from "./engine";

export const STORAGE_KEY = "dream-team-nfl-v1";

export type LoadResult =
  | { ok: true; state: GameState }
  | { ok: false; notice: "corrupt" }
  | { ok: false; notice: "missing" };

export function saveGame(state: GameState, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGame(storage: Storage = localStorage): LoadResult {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { ok: false, notice: "missing" };
  try {
    const state = JSON.parse(raw) as GameState;
    if (!Array.isArray(state.players) || !Array.isArray(state.dreamTeams)) {
      return { ok: false, notice: "corrupt" };
    }
    return { ok: true, state };
  } catch {
    return { ok: false, notice: "corrupt" };
  }
}
```

`src/ai/parseVerdict.ts`:

```ts
import type { SlotVerdict, Verdict } from "./schema";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseVerdict(raw: unknown, playerIds: string[]): Verdict {
  if (!isRecord(raw) || !Array.isArray(raw.records)) throw new Error("invalid verdict");
  if (raw.records.length !== playerIds.length) throw new Error("record count");
  const seen = new Set<string>();
  const records: SlotVerdict[] = raw.records.map((row) => {
    if (!isRecord(row)) throw new Error("row");
    const playerId = String(row.playerId);
    if (!playerIds.includes(playerId) || seen.has(playerId)) throw new Error("player");
    seen.add(playerId);
    const wins = Number(row.wins);
    if (!Number.isInteger(wins) || wins < 0 || wins > 17) throw new Error("wins");
    const paragraph = String(row.paragraph ?? "");
    const strength = String(row.strength ?? "");
    const hole = String(row.hole ?? "");
    const playerToWatch = String(row.playerToWatch ?? "");
    if (!paragraph || !strength || !hole || !playerToWatch) throw new Error("copy");
    return {
      playerId,
      wins,
      record: `${wins}–${17 - wins}`,
      paragraph,
      strength,
      hole,
      playerToWatch,
    };
  });
  const championPlayerId = String(raw.championPlayerId ?? "");
  if (!playerIds.includes(championPlayerId)) throw new Error("champion");
  const maxWins = Math.max(...records.map((r) => r.wins));
  const recordsTied = records.filter((r) => r.wins === maxWins).length > 1;
  return {
    records,
    championPlayerId,
    recordsTied,
    tiebreakLine: String(raw.tiebreakLine ?? ""),
  };
}
```

`src/ai/client.ts`:

```ts
import type { DreamTeam, League } from "../league/types";
import { parseVerdict } from "./parseVerdict";
import type { Verdict } from "./schema";

export const SCORE_ERROR = "Couldn't score this one — try again.";

export type RevealResult = { ok: true; verdict: Verdict } | { ok: false };

export function toRevealBody(dreamTeams: DreamTeam[], league: League) {
  return {
    dreamTeams: dreamTeams.map((dt) => ({
      playerId: dt.playerId,
      name: dt.name,
      slots: dt.picks.map((p) => {
        const team = league.teams.find((t) => t.id === p.teamId);
        const asset = team?.assets.find((a) => a.id === p.assetId);
        return {
          slotId: p.slotId,
          assetName: asset?.name ?? p.assetId,
          teamName: team?.name ?? p.teamId,
        };
      }),
    })),
  };
}

export async function fetchReveal(
  dreamTeams: DreamTeam[],
  league: League,
  signal: AbortSignal = AbortSignal.timeout(20_000),
): Promise<RevealResult> {
  try {
    const res = await fetch("/api/reveal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toRevealBody(dreamTeams, league)),
      signal,
    });
    if (!res.ok) return { ok: false };
    const json: unknown = await res.json();
    if (!json || typeof json !== "object" || !("ok" in json)) return { ok: false };
    const body = json as { ok: boolean; verdict?: unknown };
    if (!body.ok || body.verdict === undefined) return { ok: false };
    return {
      ok: true,
      verdict: parseVerdict(
        body.verdict,
        dreamTeams.map((d) => d.playerId),
      ),
    };
  } catch {
    return { ok: false };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run
```

Expected: all existing tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/persist.ts src/game/persist.test.ts src/ai/parseVerdict.ts src/ai/parseVerdict.test.ts src/ai/client.ts
git commit -m "feat: persist game state and validate AI verdicts"
```

---

### Task 5: Reveal Worker

**Files:**
- Create: `worker/index.ts`
- Create: `worker/prompt.ts`
- Test: `src/ai/workerReveal.test.ts` (pure prompt + handler with fake `AI`)

**Interfaces:**
- Consumes: `parseVerdict(raw: unknown, playerIds: string[]): Verdict`
- Produces: `fetch(request, env): Promise<Response>` for `POST /api/reveal` only. Other paths return 404 so the SPA assets plugin can serve the UI. If the Cloudflare Vite plugin routes all unmatched URLs to the Worker, return `undefined` / `env.ASSETS` only if the generated types expose it — **do not add a second product**. Minimum: `POST /api/reveal`. GET `/api/reveal` → 405.

Env:

```ts
export type Env = { AI: { run: (model: string, input: { messages: { role: string; content: string }[] }) => Promise<{ response?: string }> } };
```

- [ ] **Step 1: Write the failing test**

`src/ai/workerReveal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { handleReveal } from "../../worker/index";
import { SCORE_ERROR } from "./client";

const body = {
  dreamTeams: [
    {
      playerId: "p0",
      name: "Berny",
      slots: [{ slotId: "qb", assetName: "Malik Willis", teamName: "Tennessee Titans" }],
    },
    {
      playerId: "p1",
      name: "Andres",
      slots: [{ slotId: "qb", assetName: "Patrick Mahomes", teamName: "Kansas City Chiefs" }],
    },
  ],
};

const modelJson = JSON.stringify({
  records: [
    { playerId: "p0", wins: 13, paragraph: "Why A", strength: "WRs", hole: "QB", playerToWatch: "Bijan" },
    { playerId: "p1", wins: 15, paragraph: "Why B", strength: "QB", hole: "WR1", playerToWatch: "Mahomes" },
  ],
  championPlayerId: "p1",
  tiebreakLine: "QB",
});

describe("handleReveal", () => {
  it("returns ok verdict from model JSON", async () => {
    const env = {
      AI: { run: async () => ({ response: modelJson }) },
    };
    const res = await handleReveal(
      new Request("https://x/api/reveal", { method: "POST", body: JSON.stringify(body) }),
      env,
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.verdict.championPlayerId).toBe("p1");
  });

  it("returns SCORE_ERROR on garbage model output", async () => {
    const env = { AI: { run: async () => ({ response: "not json" }) } };
    const res = await handleReveal(
      new Request("https://x/api/reveal", { method: "POST", body: JSON.stringify(body) }),
      env,
    );
    const json = await res.json();
    expect(res.status).toBe(502);
    expect(json).toEqual({ ok: false, error: SCORE_ERROR });
  });

  it("returns SCORE_ERROR when AI throws", async () => {
    const env = { AI: { run: async () => { throw new Error("timeout"); } } };
    const res = await handleReveal(
      new Request("https://x/api/reveal", { method: "POST", body: JSON.stringify(body) }),
      env,
    );
    expect((await res.json()).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/ai/workerReveal.test.ts
```

Expected: FAIL — `handleReveal` not exported

- [ ] **Step 3: Implement worker**

`worker/prompt.ts`:

```ts
export function revealPrompt(dreamTeams: {
  playerId: string;
  name: string;
  slots: { slotId: string; assetName: string; teamName: string }[];
}[]): string {
  const boards = dreamTeams
    .map((dt) => {
      const lines = dt.slots.map((s) => `${s.slotId}: ${s.assetName} (${s.teamName})`).join("\n");
      return `${dt.name} [${dt.playerId}]\n${lines}`;
    })
    .join("\n\n");
  return [
    "You are a concise NFL studio desk. Ignore injuries and availability. Judge talent only.",
    "Each roster is a 9-slot dream team. Predict a 17-game record (wins 0-17).",
    "Winner is closest to 17-0 (most wins). If wins tie, still pick championPlayerId and write tiebreakLine.",
    "Return ONLY JSON with keys: records (array), championPlayerId, tiebreakLine.",
    "Each record: playerId, wins (integer), paragraph (2-4 sentences), strength, hole, playerToWatch.",
    "English. No markdown.",
    "",
    boards,
  ].join("\n");
}
```

`worker/index.ts`:

```ts
import { SCORE_ERROR } from "../src/ai/client";
import { parseVerdict } from "../src/ai/parseVerdict";
import { revealPrompt } from "./prompt";

export type Env = {
  AI: {
    run: (
      model: string,
      input: { messages: { role: string; content: string }[] },
    ) => Promise<{ response?: string }>;
  };
};

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no json");
  return JSON.parse(text.slice(start, end + 1));
}

export async function handleReveal(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: SCORE_ERROR }, { status: 405 });
  }
  try {
    const body = (await request.json()) as {
      dreamTeams: { playerId: string; name: string; slots: { slotId: string; assetName: string; teamName: string }[] }[];
    };
    const playerIds = body.dreamTeams.map((d) => d.playerId);
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "user", content: revealPrompt(body.dreamTeams) }],
    });
    const verdict = parseVerdict(extractJson(String(result.response ?? "")), playerIds);
    return Response.json({ ok: true, verdict });
  } catch {
    return Response.json({ ok: false, error: SCORE_ERROR }, { status: 502 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/reveal") return handleReveal(request, env);
    return new Response("Not found", { status: 404 });
  },
};
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/ai/workerReveal.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add worker/index.ts worker/prompt.ts src/ai/workerReveal.test.ts
git commit -m "feat: add reveal Worker with fakeable Workers AI"
```

---

### Task 6: Full 2026 league JSON

**Files:**
- Create: `src/league/assertLeague.ts`
- Create: `src/data/league.json`
- Test: `src/league/assertLeague.test.ts`

**Interfaces:**
- Consumes: `TEAM_IDS` from `src/league/ids.ts`; `League` from `src/league/types.ts`
- Produces: `assertLeague(league: League): void` — throws if the contract fails. App runtime imports `src/data/league.json` as `League`.

**Research procedure (do this before writing `league.json`):**

1. For each id in `TEAM_IDS`, look up the **2026** starting/skill-player menu from current public NFL sources (team official site, NFL.com, ESPN depth chart). Ignore IR, Week 1 rest, and “may not play.”
2. Confirm Rams `defPlayer` includes **Aaron Donald** and **Myles Garrett** (2026 return / pairing). If a source disagrees, prefer official Rams / NFL.com dated 2026.
3. Per team write exactly this menu size unless the franchise truly lacks a second name: QB 1–2, RB 1–2, WR 2–3, TE 1, Def Player **2–3**, Def 1 unit, O-line 1 unit, Coach 1.
4. Asset ids: `{teamId}-{group}-{slug}` kebab-case, unique globally.
5. Unit names: `"{City or nickname} Defense"`, `"{Nickname} O-line"`, coach real name.

- [ ] **Step 1: Write the failing contract test**

`src/league/assertLeague.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { League } from "./types";
import { assertLeague } from "./assertLeague";

describe("league.json", () => {
  it("meets the 2026 short-menu contract", () => {
    const league = JSON.parse(readFileSync("src/data/league.json", "utf8")) as League;
    expect(() => assertLeague(league)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/league/assertLeague.test.ts
```

Expected: FAIL — file missing or `assertLeague` missing

- [ ] **Step 3: Write `assertLeague` then fill `league.json`**

`src/league/assertLeague.ts`:

```ts
import { TEAM_IDS } from "./ids";
import type { League, MenuGroup } from "./types";

const MIN: Record<MenuGroup, number> = {
  qb: 1,
  rb: 1,
  wr: 2,
  te: 1,
  defPlayer: 2,
  def: 1,
  oline: 1,
  coach: 1,
};

const MAX: Record<MenuGroup, number> = {
  qb: 2,
  rb: 2,
  wr: 3,
  te: 1,
  defPlayer: 3,
  def: 1,
  oline: 1,
  coach: 1,
};

export function assertLeague(league: League): void {
  if (league.season !== 2026) throw new Error("season");
  if (league.teams.length !== 32) throw new Error("need 32 teams");
  const ids = league.teams.map((t) => t.id).sort();
  if (ids.join() !== [...TEAM_IDS].sort().join()) throw new Error("team ids");
  const assetIds = new Set<string>();
  for (const team of league.teams) {
    const counts: Partial<Record<MenuGroup, number>> = {};
    for (const a of team.assets) {
      if (a.teamId !== team.id) throw new Error(`teamId ${a.id}`);
      if (assetIds.has(a.id)) throw new Error(`dup ${a.id}`);
      assetIds.add(a.id);
      counts[a.group] = (counts[a.group] ?? 0) + 1;
    }
    (Object.keys(MIN) as MenuGroup[]).forEach((g) => {
      const n = counts[g] ?? 0;
      if (n < MIN[g] || n > MAX[g]) throw new Error(`${team.id} ${g} ${n}`);
    });
  }
  const lar = league.teams.find((t) => t.id === "lar");
  const names = (lar?.assets ?? []).map((a) => a.name);
  if (!names.includes("Aaron Donald")) throw new Error("Donald missing");
  if (!names.includes("Myles Garrett")) throw new Error("Garrett missing");
}
```

Write `src/data/league.json` with all 32 teams satisfying `assertLeague`. Copy fixture teams `min`, `kc`, `lar`, `chi`, `atl`, `jax` as a starting point, then research and replace any stale names. Do not leave empty `assets` arrays.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/league/assertLeague.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/league/assertLeague.ts src/league/assertLeague.test.ts src/data/league.json
git commit -m "data: add 2026 32-team short menus without injury flags"
```

---

### Task 7: Look D chrome + screens

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`
- Create: `src/ui/RosterRail.tsx`
- Create: `src/ui/LowerThird.tsx`
- Create: `src/ui/Wheel.tsx`
- Create: `src/ui/SetupScreen.tsx`
- Create: `src/ui/SpinScreen.tsx`
- Create: `src/ui/PickScreen.tsx`
- Create: `src/ui/RevealScreen.tsx`
- Create: `src/ui/App.tsx`
- Modify: `src/main.tsx`
- Test: `src/ui/App.flow.test.ts` (engine + client mock, not pixel tests)

**Interfaces:**
- Consumes: `startGame`, `beginSpin`, `completeSpin`, `lockPick`, `playAgain`, `applyVerdict`, `createSetupDefaults`, `currentPlayerId`, `dreamTeamOf`, `legalMenu`, `legalTeamsForPlayer`, `fetchReveal`, `SCORE_ERROR`, `saveGame`, `loadGame`, `SLOT_DEFS`, `league.json`
- Produces: mounted SPA with phases `setup | spin | pick | revealReady | scored | tied`

Look D tokens — use exactly:

```css
:root {
  --navy: #071018;
  --panel: #0b1a2b;
  --gold: #c9a227;
  --chalk: #f4efe4;
  --muted: #b7b0a3;
  --turf: #3d7a4a;
  --font-display: "Oswald", sans-serif;
  --font-body: "Inter", sans-serif;
}
```

Match comps: stadium-night background (CSS radial + dark photo optional from unsplash only if needed; a CSS gradient is enough). Gold lower-third. Slim left rail. Centered wheel. Turf only as `border-bottom: 1px solid var(--turf)` on the active slot.

- [ ] **Step 1: Write the failing App flow test**

`src/ui/App.flow.test.ts` — do **not** require a DOM library if not installed. Test the handlers the UI must call, in a tiny `src/ui/session.ts` helper the screens use:

```ts
import type { League } from "../league/types";
import type { GameState } from "../game/engine";
import { beginSpin, completeSpin, lockPick, startGame } from "../game/engine";
import { createSetupDefaults } from "../game/engine";

export function spinAndLand(
  state: GameState,
  league: League,
  rng: () => number,
): GameState {
  return completeSpin(beginSpin(state), league, rng);
}
```

`src/ui/session.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { League } from "../league/types";
import { createSetupDefaults, startGame } from "../game/engine";
import { spinAndLand } from "./session";

const league = JSON.parse(
  readFileSync("src/data/league.fixture.json", "utf8"),
) as League;

describe("session helpers", () => {
  it("spinAndLand moves setup game to pick", () => {
    const state = startGame(createSetupDefaults(2), "roundRobin");
    const next = spinAndLand(state, league, () => 0);
    expect(next.phase).toBe("pick");
    expect(next.currentTeamId).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/ui/session.test.ts
```

Expected: FAIL — `./session` missing

- [ ] **Step 3: Implement session helper + full UI**

`src/ui/session.ts` as above.

`src/styles/tokens.css` — tokens block above plus:

```css
* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; }
body {
  background: radial-gradient(ellipse at 50% 20%, #1a2433 0%, var(--navy) 55%, #020508 100%);
  color: var(--chalk);
  font-family: var(--font-body);
}
h1, h2, .display { font-family: var(--font-display); letter-spacing: 0.04em; text-transform: uppercase; }
button.primary {
  background: transparent;
  color: var(--chalk);
  border: 2px solid var(--gold);
  padding: 0.7rem 1.6rem;
  font-family: var(--font-display);
  font-size: 1.2rem;
  cursor: pointer;
}
button.primary:disabled { opacity: 0.4; cursor: default; }
```

`src/styles/app.css`:

```css
@import "./tokens.css";

.shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}
.shell.setup, .shell.reveal { grid-template-columns: 1fr; }
.rail {
  border-right: 1px solid rgba(201, 162, 39, 0.35);
  padding: 1.25rem 1rem;
}
.rail li { list-style: none; padding: 0.45rem 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
.rail li.active { border-bottom: 1px solid var(--turf); }
.stage { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.lower {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  background: var(--gold);
  color: var(--navy);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.5rem;
}
.lower h2 { margin: 0; font-size: clamp(1.6rem, 4vw, 3rem); }
.wheel {
  width: min(52vh, 520px);
  aspect-ratio: 1;
  border-radius: 50%;
  border: 10px solid var(--gold);
  position: relative;
}
.wheel-pointer {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 18px solid var(--gold);
}
.setup-card { text-align: center; padding: 8vh 1rem 20vh; }
.setup-card h1 { font-size: clamp(2.5rem, 8vw, 5rem); margin: 0 0 0.5rem; }
.name-row { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin: 1rem 0; }
.name-row input, .count-step {
  background: var(--panel);
  border: 1px solid var(--gold);
  color: var(--chalk);
  padding: 0.5rem 0.7rem;
}
.pick-list { width: min(420px, 90vw); }
.pick-list button {
  width: 100%;
  text-align: left;
  background: var(--panel);
  border: 1px solid rgba(201,162,39,0.4);
  color: var(--chalk);
  padding: 0.65rem 0.8rem;
  margin: 0.3rem 0;
}
.pick-list button.chosen { border-color: var(--gold); border-bottom: 1px solid var(--turf); }
.records { display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; }
.records span { font-family: var(--font-display); font-size: 1.4rem; color: var(--gold); }
.winner { font-size: clamp(3rem, 10vw, 7rem); margin: 0.4rem 0 4rem; }
.notice { color: var(--gold); }
@media (max-width: 720px) {
  .shell { grid-template-columns: 1fr; }
  .rail { border-right: 0; border-bottom: 1px solid rgba(201,162,39,0.35); }
}
```

`src/ui/RosterRail.tsx`:

```tsx
import { SLOT_DEFS } from "../league/ids";
import type { DreamTeam } from "../league/types";

export function RosterRail(props: { team: DreamTeam; leagueName: (assetId: string) => string }) {
  return (
    <aside className="rail">
      <ol>
        {SLOT_DEFS.map((slot) => {
          const pick = props.team.picks.find((p) => p.slotId === slot.id);
          return (
            <li key={slot.id} className={pick ? "filled" : ""}>
              {slot.label}: {pick ? props.leagueName(pick.assetId) : "—"}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
```

`src/ui/LowerThird.tsx`:

```tsx
import type { ReactNode } from "react";

export function LowerThird(props: { title: string; meta?: string; action: ReactNode }) {
  return (
    <footer className="lower">
      <div>
        <h2 className="display">{props.title}</h2>
        {props.meta ? <p>{props.meta}</p> : null}
      </div>
      {props.action}
    </footer>
  );
}
```

`src/ui/Wheel.tsx`:

```tsx
import type { LeagueTeam } from "../league/types";

export function Wheel(props: { teams: LeagueTeam[]; spinning: boolean }) {
  const colors = ["#9b1b30", "#0b3d91", "#0d5c3d", "#c96a17", "#4b2e83", "#c9a227"];
  const n = Math.max(props.teams.length, 1);
  const stops = props.teams
    .map((t, i) => {
      const a = (i / n) * 360;
      const b = ((i + 1) / n) * 360;
      return `${colors[i % colors.length]} ${a}deg ${b}deg`;
    })
    .join(", ");
  return (
    <div style={{ position: "relative" }}>
      <div className="wheel-pointer" />
      <div
        className="wheel"
        style={{
          background: `conic-gradient(${stops || "var(--panel) 0 360deg"})`,
          transition: props.spinning ? "transform 1.6s cubic-bezier(.2,.8,.2,1)" : "none",
          transform: props.spinning ? "rotate(1040deg)" : "rotate(0deg)",
        }}
        aria-label="NFL team wheel"
      />
    </div>
  );
}
```

`src/ui/SetupScreen.tsx`:

```tsx
import { useState } from "react";
import type { TurnMode } from "../league/types";
import { createSetupDefaults } from "../game/engine";

export function SetupScreen(props: {
  notice: "none" | "corrupt";
  onStart: (names: { id: string; name: string }[], turnMode: TurnMode) => void;
}) {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(() => createSetupDefaults(4).map((p) => p.name));
  const [turnMode, setTurnMode] = useState<TurnMode>("roundRobin");

  function setCountSafe(n: number) {
    const next = Math.min(6, Math.max(2, n));
    setCount(next);
    setNames((prev) =>
      createSetupDefaults(next).map((p, i) => prev[i] ?? p.name),
    );
  }

  return (
    <main className="shell setup">
      <div className="setup-card">
        <p className="display">Dream Team</p>
        <h1 className="display">Build the table.</h1>
        <p>2 to 6 players · one computer</p>
        {props.notice === "corrupt" ? <p className="notice">Saved game was damaged. Starting fresh.</p> : null}
        <div>
          <button type="button" className="count-step" onClick={() => setCountSafe(count - 1)}>-</button>
          <span className="display"> {count} </span>
          <button type="button" className="count-step" onClick={() => setCountSafe(count + 1)}>+</button>
        </div>
        <div className="name-row">
          {names.map((name, i) => (
            <input
              key={i}
              value={name}
              onChange={(e) =>
                setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))
              }
            />
          ))}
        </div>
        <p>
          <button type="button" className={turnMode === "roundRobin" ? "primary" : ""} onClick={() => setTurnMode("roundRobin")}>
            Round robin
          </button>
          <button type="button" className={turnMode === "snake" ? "primary" : ""} onClick={() => setTurnMode("snake")}>
            Snake
          </button>
        </p>
        <button
          type="button"
          className="primary"
          onClick={() =>
            props.onStart(
              names.map((name, i) => ({ id: `p${i}`, name: name.trim() || `Player ${i + 1}` })),
              turnMode,
            )
          }
        >
          Start game
        </button>
      </div>
    </main>
  );
}
```

`src/ui/SpinScreen.tsx`:

```tsx
import { legalTeamsForPlayer } from "../game/eligibility";
import { currentPlayerId, dreamTeamOf, type GameState } from "../game/engine";
import type { League } from "../league/types";
import { LowerThird } from "./LowerThird";
import { RosterRail } from "./RosterRail";
import { Wheel } from "./Wheel";

export function SpinScreen(props: {
  state: GameState;
  league: League;
  assetName: (id: string) => string;
  onSpin: () => void;
}) {
  const pid = currentPlayerId(props.state);
  const player = props.state.players.find((p) => p.id === pid)!;
  const dt = dreamTeamOf(props.state, pid);
  const legal = legalTeamsForPlayer(props.league, dt, props.state.takenAssetIds);
  return (
    <main className="shell">
      <RosterRail team={dt} leagueName={props.assetName} />
      <section className="stage">
        <p className="display">Dream Team</p>
        <Wheel teams={legal} spinning={props.state.spinning} />
        {props.state.emptyLegal ? <p className="notice">No legal teams left</p> : null}
        <LowerThird
          title={`${player.name}'s turn`}
          meta={`Pick ${dt.picks.length + 1} of 9 · ${props.state.turnMode === "snake" ? "Snake" : "Round robin"}`}
          action={
            <button className="primary" type="button" disabled={props.state.spinning || legal.length === 0} onClick={props.onSpin}>
              Spin
            </button>
          }
        />
      </section>
    </main>
  );
}
```

`src/ui/PickScreen.tsx`:

```tsx
import { useState } from "react";
import { emptySlots, legalMenu } from "../game/eligibility";
import { currentPlayerId, dreamTeamOf, type GameState } from "../game/engine";
import { SLOT_DEFS } from "../league/ids";
import type { League, LeagueAsset, SlotId } from "../league/types";
import { LowerThird } from "./LowerThird";
import { RosterRail } from "./RosterRail";

export function PickScreen(props: {
  state: GameState;
  league: League;
  assetName: (id: string) => string;
  onLock: (assetId: string, slotId: SlotId) => void;
}) {
  const pid = currentPlayerId(props.state);
  const player = props.state.players.find((p) => p.id === pid)!;
  const dt = dreamTeamOf(props.state, pid);
  const team = props.league.teams.find((t) => t.id === props.state.currentTeamId)!;
  const menu = legalMenu(props.league, dt, props.state.takenAssetIds, team.id);
  const [chosen, setChosen] = useState<LeagueAsset | null>(null);
  const open = emptySlots(dt);
  const slotFor = (asset: LeagueAsset): SlotId | null =>
    open.find((s) => SLOT_DEFS.find((d) => d.id === s)?.group === asset.group) ?? null;

  return (
    <main className="shell">
      <RosterRail team={dt} leagueName={props.assetName} />
      <section className="stage">
        <p className="display">{team.name}</p>
        <div className="pick-list">
          {menu.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={chosen?.id === asset.id ? "chosen" : ""}
              onClick={() => setChosen(asset)}
            >
              {SLOT_DEFS.find((s) => s.group === asset.group)?.label} · {asset.name}
            </button>
          ))}
        </div>
        <LowerThird
          title={`${player.name} · lock in`}
          meta={`Pick ${dt.picks.length + 1} of 9`}
          action={
            <button
              className="primary"
              type="button"
              disabled={!chosen || !slotFor(chosen)}
              onClick={() => {
                if (!chosen) return;
                const slot = slotFor(chosen);
                if (slot) props.onLock(chosen.id, slot);
              }}
            >
              Lock in
            </button>
          }
        />
      </section>
    </main>
  );
}
```

`src/ui/RevealScreen.tsx`:

```tsx
import { SCORE_ERROR } from "../ai/client";
import type { GameState } from "../game/engine";

export function RevealScreen(props: {
  state: GameState;
  scoring: boolean;
  scoreError: string | null;
  showWhy: boolean;
  showTiebreak: boolean;
  onReveal: () => void;
  onWhy: () => void;
  onTiebreak: () => void;
  onPlayAgain: () => void;
}) {
  const { state } = props;
  if (state.phase === "revealReady") {
    return (
      <main className="shell reveal">
        <div className="setup-card">
          <p>All 9 slots filled.</p>
          {props.scoreError ? <p className="notice">{props.scoreError}</p> : null}
          <button className="primary" type="button" disabled={props.scoring} onClick={props.onReveal}>
            Reveal results
          </button>
        </div>
      </main>
    );
  }

  const records = state.verdict?.records ?? [];
  const champ = state.verdict?.records.find((r) => r.playerId === state.verdict?.championPlayerId);
  const champName = state.players.find((p) => p.id === state.verdict?.championPlayerId)?.name ?? "";
  const showChamp = state.phase === "scored" || props.showTiebreak;

  return (
    <main className="shell reveal">
      <div className="setup-card">
        <div className="records">
          {records.map((r) => {
            const name = state.players.find((p) => p.id === r.playerId)?.name ?? r.playerId;
            return (
              <span key={r.playerId}>
                {name} {r.record}
              </span>
            );
          })}
        </div>
        {showChamp ? <h1 className="display winner">{champName} wins</h1> : null}
        {showChamp ? <p>Closest to 17–0</p> : null}
        {state.phase === "tied" && !props.showTiebreak ? (
          <button className="primary" type="button" onClick={props.onTiebreak}>
            Tiebreaker
          </button>
        ) : null}
        {state.phase === "tied" && props.showTiebreak ? <p>{state.verdict?.tiebreakLine}</p> : null}
        {showChamp ? (
          <button className="primary" type="button" onClick={props.onWhy}>
            Why these records?
          </button>
        ) : null}
        {props.showWhy
          ? records.map((r) => {
              const name = state.players.find((p) => p.id === r.playerId)?.name ?? r.playerId;
              return (
                <article key={r.playerId}>
                  <h3>
                    {name} — {r.record}
                  </h3>
                  <p>{r.paragraph}</p>
                  <p>Strength: {r.strength}</p>
                  <p>Hole: {r.hole}</p>
                  <p>To watch: {r.playerToWatch}</p>
                </article>
              );
            })
          : null}
        <p>
          <button type="button" onClick={props.onPlayAgain}>
            Play again
          </button>
        </p>
        {props.scoreError ? <p className="notice">{SCORE_ERROR}</p> : null}
      </div>
    </main>
  );
}
```

`src/ui/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import leagueJson from "../data/league.json";
import { fetchReveal, SCORE_ERROR } from "../ai/client";
import {
  applyVerdict,
  lockPick,
  playAgain,
  startGame,
  type GameState,
} from "../game/engine";
import { loadGame, saveGame } from "../game/persist";
import type { League, SlotId, TurnMode } from "../league/types";
import { PickScreen } from "./PickScreen";
import { RevealScreen } from "./RevealScreen";
import { SetupScreen } from "./SetupScreen";
import { SpinScreen } from "./SpinScreen";
import { spinAndLand } from "./session";

const league = leagueJson as League;

export function App() {
  const [mode, setMode] = useState<"setup" | "play">("setup");
  const [notice, setNotice] = useState<"none" | "corrupt">("none");
  const [state, setState] = useState<GameState | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [showTiebreak, setShowTiebreak] = useState(false);

  useEffect(() => {
    const loaded = loadGame();
    if (loaded.ok) {
      setState(loaded.state);
      setMode("play");
    } else if (loaded.notice === "corrupt") {
      setNotice("corrupt");
    }
  }, []);

  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);

  const assetName = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of league.teams) for (const a of t.assets) map.set(a.id, a.name);
    return (id: string) => map.get(id) ?? id;
  }, []);

  if (mode === "setup" || !state) {
    return (
      <SetupScreen
        notice={notice}
        onStart={(players, turnMode: TurnMode) => {
          setState(startGame(players, turnMode));
          setMode("play");
          setNotice("none");
        }}
      />
    );
  }

  if (state.phase === "spin") {
    return (
      <SpinScreen
        state={state}
        league={league}
        assetName={assetName}
        onSpin={() => {
          const next = spinAndLand(state, league, Math.random);
          setState(next);
        }}
      />
    );
  }

  if (state.phase === "pick") {
    return (
      <PickScreen
        state={state}
        league={league}
        assetName={assetName}
        onLock={(assetId, slotId: SlotId) => setState(lockPick(state, league, assetId, slotId))}
      />
    );
  }

  return (
    <RevealScreen
      state={state}
      scoring={scoring}
      scoreError={scoreError}
      showWhy={showWhy}
      showTiebreak={showTiebreak}
      onReveal={async () => {
        setScoring(true);
        setScoreError(null);
        const result = await fetchReveal(state.dreamTeams, league);
        setScoring(false);
        if (!result.ok) {
          setScoreError(SCORE_ERROR);
          return;
        }
        setState(applyVerdict(state, result.verdict));
      }}
      onWhy={() => setShowWhy(true)}
      onTiebreak={() => setShowTiebreak(true)}
      onPlayAgain={() => {
        setShowWhy(false);
        setShowTiebreak(false);
        setScoreError(null);
        setState(playAgain(state));
      }}
    />
  );
}
```

`src/main.tsx`:

```tsx
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(<App />);
```

Add `resolveJsonModule` to `tsconfig.app.json`:

```json
"compilerOptions": {
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "jsx": "react-jsx",
  "strict": true,
  "skipLibCheck": true,
  "noEmit": true,
  "resolveJsonModule": true,
  "types": ["vite/client"]
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: PASS

Then:

```bash
npm run dev
```

Expected: Vite serves the setup screen at `http://localhost:5173`. Click through a 2-player game using the fixture-equivalent teams in `league.json`.

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css src/styles/app.css src/ui src/main.tsx tsconfig.app.json
git commit -m "feat: add Look D Prime Time setup, wheel, pick, and reveal screens"
```

---

### Task 8: Manual QA (desktop + phone)

**Files:** none required unless a bugfix.

**Interfaces:**
- Consumes: running app via `npm run dev` (UI) and `npm run cf:dev` (real reveal)
- Produces: checked list below; fix any fail in the file that owns the bug, add a regression test if the bug is in engine/parseVerdict/worker

- [ ] **Step 1: 2-player happy path on desktop (wide viewport)**

Start `npm run dev`. Two named players, round robin. Complete 18 spins. Confirm: one franchise per roster, no duplicate assets, **Reveal results** hides records until clicked.

- [ ] **Step 2: 3-player snake**

New game, 3 players, Snake. Confirm the last player of a round spins twice in a row when the snake turns.

- [ ] **Step 3: Refresh mid-game**

After pick 3, refresh. Same names, same filled slots, same current turn.

- [ ] **Step 4: Reveal offline / failed Worker**

With `npm run dev` only (no remote AI), tap Reveal. Must show `Couldn't score this one — try again.` Rosters stay. Retry does not respin.

- [ ] **Step 5: Real verdict**

```bash
npx wrangler login
npm run cf:dev
```

Reveal once. Records appear; winner huge if unique. If the model returns equal wins, **Tiebreaker** appears before the champion. **Why these records?** shows paragraph + Strength / Hole / Player to watch.

- [ ] **Step 6: Phone width**

Resize to 390px. Setup, rail, wheel, and lower-third remain usable (stack; no horizontal clip of Spin / Lock in).

- [ ] **Step 7: Play again**

Keeps names + mode; clears picks and scores.

- [ ] **Step 8: Commit only if you changed code**

```bash
git add -u
git commit -m "fix: address manual QA issues on draft flow"
```

Skip the commit if `git status` is clean.

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| 2–6 players, editable Player N names | 3, 7 |
| Round robin default, snake optional | 1, 7 |
| 9 fixed slots | 2, 7 |
| One franchise per dream team; WRs from two teams | 2, 3 |
| Same franchise OK across table; same asset not | 2, 3 |
| Wheel = legal teams only | 2, 3, 7 |
| Spin then choose slot | 3, 7 |
| Def Player 2–3 names | 6 (`assertLeague` min/max) |
| No injuries; Donald + Garrett on Rams | 6 |
| Reveal / records first / Why / Tiebreaker | 3, 4, 5, 7 |
| Winner closest to 17–0 | 5 prompt + 4 `wins` |
| Worker fail copy exact | 4, 5, 7 |
| Play again keeps setup | 3, 7 |
| localStorage + corrupt notice | 4, 7 |
| Double-spin ignored | 3 |
| No legal teams copy | 3, 7 |
| Look D desktop-first | 7, 8 |
| English UI | 7 |
| Pages + JSON + one Worker | 1, 5, 6 |
| Unit tests listed in spec | 1–5 |
| Manual tests listed in spec | 8 |
 