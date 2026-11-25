# Segment-length inputs — design (short)

Date: 2026-11-25
Source of truth: *IR Radiator Delay Compensation Reference Guide*, worked example §4 ("segment lengths: Output → R1 = 25 m, R1 → R2 = 25 m, R2 → R3 = 50 m, R3 → R4 = 100 m, R4 → R5 = 50 m").

## Intent

Technicians measure and think in cable segments between radiators, not cumulative totals. Each radiator field should hold the segment since the previous point — TX→RAD-01 for the first radiator, RAD-N−1→RAD-N for the rest — with the app computing the cumulative run internally.

## Goals

1. Input semantics flip to segments; cumulative totals computed automatically.
2. Delay, switch, budget flags, pooling (Scenario C) all derive from the computed total — formulas unchanged.
3. Results table: Segment column = typed input, Total column = computed run.
4. Tests use the guide's literal worked-example segment numbers (25/25/50/100/50 @ 4.0 ns/m → same outputs as before: totals 25/50/100/200/250, Bosch 27/24/18/06/00, TAIDEN 36/32/24/08/00).

## Non-goals

- No dual input mode / toggle; no migration (nothing is persisted — in-flight numbers get re-typed once).
- No changes to switch math, budget rules, or the selector.

## Constraints

- No new dependencies. Pure-function tests only. Two-digit decimal switch settings, budget = 99 × step, `Math.round`.

## Approaches

- **A (picked):** flip the field semantics inside `calc.js` (parse segment, sum into cumulative). Matches the guide's own worked-example layout and the request exactly.
- B: dual-mode toggle (totals vs segments) — rejected: nobody asked; doubles UI and test surface for one audience.
- C: keep totals, relabel only — rejected: contradicts the request.

## Design (calls made by me)

- Radiator row fields: `segmentLength` = typed input, `cumulativeLength` = running sum (drives delay/switch/`isOverMax`/output totals); the duplicate `cableLength` field is deleted and the PDF's two references switch to `cumulativeLength`.
- RAD-01's field is the TX→RAD-01 run (per the request's own example: RAD-01 stays 25).
- Negative typed segments are shown as-is and reduce the total (visible typo signal, finite, no crash).
- Hint line: "Enter the segment length from the previous radiator (or TX for the first). Totals are calculated automatically."
