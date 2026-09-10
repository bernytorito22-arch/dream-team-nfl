# Phone chrome implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En viewports de menos de 768px, pick/spin/wait/reveal/setup se usan con el pulgar (Roster en hoja, Lock/Spin fijos). A 768px o más, la UI actual no cambia.

**Architecture:** Un solo arbol React. `useCompactLayout()` lee `matchMedia('(max-width: 767px)')`. `PlayChrome` pone barra + hoja de Roster en compacto y deja el rail en el grid en desktop. El motor, rooms y copy en ingles no se tocan.

**Tech Stack:** React 19, CSS en `src/styles/app.css`, Vitest (node) para el hook. Sin librerias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-10-mobile-chrome-design.md`

## Global Constraints

- Copy UI en ingles. No cambiar reglas de spin/pick/lock/reveal/rooms.
- No pantallas duplicadas (`MobilePickScreen`, etc.). No rutas nuevas.
- Desktop (`min-width: 768px`): tres columnas en pick, rail redimensionable, lower third actual.
- Phone (`max-width: 767px`): barra Home / wordmark / Roster; hoja con `RosterRail` sin `.rail-session`; Lock/Spin sticky; tap minimo 44px; `100dvh` + `safe-area-inset`.
- Resize/rotate solo cambia chrome. Estado de juego intacto.
- Banner reconnect (`z-index: 50`) por encima de la hoja.
- Tests actuales (`npm test`) verdes. Verificar en browser ~390px y ~1280px.

## Implementation summary (completed)

| Task | Deliverable |
|------|-------------|
| 1 | `src/ui/useCompactLayout.ts` + tests |
| 2 | `ResetConfirm.tsx`, `PlayChrome.tsx`, `RosterRail` uses shared confirm |
| 3 | `PickScreen` wrapped; sheet closes on lock |
| 4 | `SpinScreen`, `WaitScreen`, `RevealScreen` wrapped; phone Spin in footer |
| 5 | `@media (max-width: 767px)` in `app.css`; `viewport-fit=cover` in `index.html` |

Removed legacy `@media (max-width: 860px)` and `@media (max-width: 720px)` pick/shell stacking so tablet/desktop keeps three-column pick from 768px up.
