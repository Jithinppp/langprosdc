# Segment-Length Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Radiator fields hold segment lengths since the previous point; cumulative totals, delays and switch settings are computed automatically from them.

**Architecture:** One flip inside the pure module `src/utils/calc.js` (two-pass: sum chains → compute switches against the global max), with the test fixture becoming the guide's literal worked-example numbers. UI copy and PDF field references follow.

**Tech Stack:** React 19, Vite 7, vitest (existing).

**Spec:** `docs/superpowers/specs/2026-11-25-segment-inputs-design.md`

## Global Constraints

- No new dependencies. No TypeScript, no component tests.
- Guide worked example, segment inputs 25/25/50/100/50 m @ 4.0 ns/m → totals 25/50/100/200/250 m, delays 100/200/400/800/1000 ns, Bosch switches 27/24/18/06/00, TAIDEN 36/32/24/08/00.
- Switch settings decimal, two-digit padded; budget = 99 × step; `Math.round` (half up).
- Output row shape: `{ radNr, segmentLength, cumulativeLength, delayNs, switchPosition, isOverMax }` — `cableLength` is deleted.

## Review Focus

Failure modes the worked-example tests don't exercise; each pinned by a named test in Task 1, Step 1.

1. **Negative typed segment** — shown as-is, reduces the total, all values finite. Pinned by `negative segment: shown as-is, reduces the total`.
2. **Empty segment among filled ones** — chain keeps summing (gap of 0 m), totals correct, no NaN. Pinned by `empty segment among filled: chain keeps summing`.
3. **RAD-01 alone on an output** — its segment is its total (TX→RAD-01), budget flags follow it. Pinned by the existing budget-flag tests (single-radiator inputs, unchanged expectations).
4. **Over-budget system** — nearest switch exceeds 99 unclamped, long radiator flagged. Pinned by the existing over-budget test (unchanged expectations under new semantics).
5. **Stale `cableLength` references** — none may survive in `src/`. Pinned by grep in Task 1, Step 5.

---

### Task 1: Segment semantics in calc.js, copy and PDF follow

**Files:**
- Modify: `src/utils/calc.js`, `src/utils/calc.test.js`, `src/App.jsx` (hint line), `src/utils/generateDelayPdf.js` (two `cableLength` refs)

**Interfaces:**
- Consumes: nothing new (same exports: `MANUFACTURERS`, `profileFor`, `calculateDelays`).
- Produces: radiator rows `{ radNr, segmentLength, cumulativeLength, delayNs, switchPosition, isOverMax }`; `cableLength` no longer exists — App and PDF must not reference it.

- [ ] **Step 1: Flip the test fixture to segment inputs (RED)**

In `src/utils/calc.test.js`: change `exampleOutputs` radiator lengths to `[{ length: '25' }, { length: '50' }, { length: '100' }, { length: '200' }, { length: '250' }]` → segments `['25', '25', '50', '100', '50']`, with the comment quoting the guide: "segment lengths: Output → R1 = 25 m, R1 → R2 = 25 m, R2 → R3 = 50 m, R3 → R4 = 100 m, R4 → R5 = 50 m". All worked-example expectations stay exactly as they are. Replace the `non-monotonic totals` test (moot under segment inputs) with:

```js
  it('negative segment: shown as-is, reduces the total', () => {
    const out = [{ numRadiators: 2, radiators: [{ length: '100' }, { length: '-25' }] }]
    const [r1, r2] = calculateDelays(out, 4.0, profileFor('bosch'))[0].radiators
    expect(r2.segmentLength).toBe(-25)
    expect(r2.cumulativeLength).toBe(75)
    expect(r2.delayNs).toBe(300)
    expect(r2.switchPosition).toBe('03')   // (400 − 300) / 33
  })

  it('empty segment among filled: chain keeps summing', () => {
    const out = [{ numRadiators: 3, radiators: [{ length: '25' }, { length: '' }, { length: '50' }] }]
    const rads = calculateDelays(out, 4.0, profileFor('bosch'))[0].radiators
    expect(rads.map(r => r.cumulativeLength)).toEqual([25, 25, 75])
    expect(rads.map(r => r.segmentLength)).toEqual([25, 0, 50])
    expect(rads.map(r => r.switchPosition)).toEqual(['06', '06', '00'])
  })
```

Single-radiator tests (pooling, budget flags, over-budget, all-empty) keep their inputs and expectations unchanged — under segment semantics a single radiator's segment IS its total.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run`
Expected: FAIL — worked-example tests (old code sets `cumulativeLength` = raw input, so totals come back as the segment inputs) and the two new tests.

- [ ] **Step 3: Implement segment semantics in `src/utils/calc.js`**

Restructure `calculateDelays` into two passes:
1. Sum each output's chain: per radiator, `segment = parseFloat(rad.length) || 0`, `cumulative += segment`; track the global max cumulative across all outputs (this replaces the raw-length scan — the old scan would wrongly take the max *segment*).
2. Build rows against `systemMaxDelayNs = globalMaxCumulative × cableDelay`: `localDelayNs = cumulative × cableDelay`, `switchPosition` divided by `profile.step` padded to two digits, `isOverMax = localDelayNs > profile.budget`, `segmentLength = segment`, `cumulativeLength = cumulative`; drop `cableLength`. Output `totalLength` = max cumulative on the output, `maxDelay = totalLength × cableDelay`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS (all tests).

- [ ] **Step 5: Update copy and PDF references, grep for stragglers**

App.jsx hint line → "Enter the segment length from the previous radiator (or TX for the first). Totals are calculated automatically." In `generateDelayPdf.js`, both `cableLength` references (drawFlow box line, table row label) → `cumulativeLength`. Then grep `src/` for `cableLength` — expect zero matches.

- [ ] **Step 6: Verify build, lint, tests**

Run: `npm run build && npx vitest run && npm run lint`
Expected: all three pass clean.

- [ ] **Step 7: Commit**

```bash
git add src/utils/calc.js src/utils/calc.test.js src/App.jsx src/utils/generateDelayPdf.js
git commit -m "feat: radiator inputs are segment lengths; totals computed automatically"
```
