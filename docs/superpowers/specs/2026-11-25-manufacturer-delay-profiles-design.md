# Manufacturer delay profiles — design (short)

Date: 2026-11-25
Source of truth: *IR Radiator Delay Compensation Reference Guide* (Bosch LBB 4512/00, TAIDEN HCS-5100, Televic Aladdin RAD25).

## Intent

LANGPROS installs three IR systems, not just Bosch. Switch math depends on the
manufacturer's step size, so the tool must produce correct settings for each.

## Goals

1. Manufacturer selector in the config card: **Bosch INTEGRUS** (33 ns),
   **TAIDEN HCS-5100** (25 ns), **Televic Aladdin** (sub-pills 25/33 ns, default 33).
2. Rest of the flow unchanged: type ns/m from the cable datasheet, type radiators, Calculate.
3. Formulas exactly per the guide (folds in audit fixes #1, #2, #12).
4. PDF report states manufacturer, step size, and budget.
5. Automated test locked to the guide's worked example.

## Non-goals

- Multi-room pooling toggle (audit #11) — outputs stay pooled per Scenario C.
- Scenario B (impulse measurement), D (master–slave +33 ns internal), E (balcony air-path).
- Televic "manual switch up to 900 m" range note — we use the standard 00–99 switch budget, per the guide's own note to apply the same delay-difference numbers.
- Persistence, backend, extra cable presets.

## Constraints

- React 19 + Vite, no TypeScript, no new runtime deps. `vitest` added as dev dep (audit #3).
- Rounding: `Math.round` (half up) — matches the guide's `round()` for non-negative values.

## Approaches

- **A (picked):** three-button segmented control; Televic reveals 25/33 sub-pills. Step and budget derive from selection; existing flow untouched.
- B: Televic fixed at 33 ns — rejected: the guide documents 25 ns chassis; prints would be ~24% high for those.
- C: free step-size input for all — rejected: every tech must recall step sizes; buttons encode the guide's model table.

## Design (calls made by me)

- `MANUFACTURERS`: Bosch step 33, TAIDEN step 25, Televic step 25|33 (sub-choice).
  **Budget = 99 × step** (Bosch 3267 ns, TAIDEN 2475 ns, Televic 2475/3267 ns).
- Over-max flag becomes delay-based: `localDelayNs > budget` (replaces the fixed
  576 m rule — wrong at any non-default cable delay). Output warning uses the same budget.
- "Max Trunk Length" readout becomes live: `budget / cableDelay`, rounded.
- "Segment Length" column shows the real segment `L[n] − L[n−1]` (guide's worked-example
  format). Input stays the **total** cable length TX→radiator (Scenario A); a one-line hint says so.
  A negative segment is a visible typo signal, shown as-is.
- Switch settings print two-digit (`06`, `00`) — the hardware is two rotary dials.
- Switching manufacturer keeps entered data; results refresh on Calculate (same as edits today).
- `calculateDelays(outputs, cableDelay, { step, budget })`; dead constants
  `MAX_TRUNK_LENGTH`, `MAX_SWITCH_POSITIONS`, `STEP_SIZE` deleted.
- PDF: header gains manufacturer + step; footer text uses the real step, not a literal `/33`.
- Tests (vitest, pure-function only): guide worked example (25/50/100/200/250 m @ 4.0 ns/m →
  Bosch 27/24/18/06/00, TAIDEN 36/32/24/08/00), Televic 25 ns, segment math, budget flag, padding.

## Left to the builder

UI copy for the selector follows the existing card's tone; exact pill styling per Tailwind
patterns already in `App.jsx`.
