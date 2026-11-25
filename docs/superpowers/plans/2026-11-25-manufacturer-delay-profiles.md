# Manufacturer Delay Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Bosch / TAIDEN / Televic selector that drives the delay-switch math (step size and 99-step budget), with formulas corrected to the reference guide.

**Architecture:** Pure math moves to `src/utils/calc.js` (manufacturer profiles, `profileFor`, `calculateDelays`) so vitest can lock it to the guide's worked example. `App.jsx` keeps only state and UI, passing a derived profile down to the results and the PDF generator. The PDF takes the profile instead of hardcoded constants.

**Tech Stack:** React 19, Vite 7, Tailwind 4, jsPDF + autotable (existing); vitest as the only new (dev) dependency.

**Spec:** `docs/superpowers/specs/2026-11-25-manufacturer-delay-profiles-design.md`

## Global Constraints

- No new runtime dependencies; `vitest` is dev-only.
- Budget is always `99 × step`. Bosch: step 33, budget 3267 ns. TAIDEN: step 25, budget 2475 ns. Televic: chosen step 25 or 33, budget 2475/3267 ns.
- Switch settings are decimal, padded to two digits (`06`, `00`, `103` stays 3 chars).
- Rounding is `Math.round` (half up), matching the guide's `round()` for non-negative values.
- Test values come verbatim from the guide's worked example: totals 25/50/100/200/250 m at 4.0 ns/m, DMAX 1000 ns → Bosch 27/24/18/06/00, TAIDEN 36/32/24/08/00, segments 25/25/50/100/50.
- No TypeScript, no component tests; UI follows the Tailwind patterns and copy tone already in `App.jsx`.
- Multi-room pooling stays as-is (global DMAX across outputs, guide Scenario C).

## Review Focus

Failure modes the worked-example tests don't exercise; each is pinned by a named test in Task 1, Step 1.

1. **Non-monotonic totals** (typo: 100 then 50) — segment shows −50 as a visible signal; delay still uses the entered total. Pinned by `non-monotonic totals: negative segment is shown`.
2. **Cable delay cleared / zero mid-entry** — all outputs stay finite, no NaN, switch `00`. Pinned by `cable delay 0 or empty lengths: all finite`.
3. **Empty radiator lengths among filled ones** — treated as 0 m at TX; finite values, no crash. Pinned by the same test.
4. **System over budget** — nearest radiator's switch exceeds 99 and is shown unclamped (`103`); the long radiator is flagged red. Pinned by `over-budget system: switch may exceed 99`.
5. **Budget differs per manufacturer on the same install** — 480 m @ 5.67 ns/m is fine on Bosch, over on TAIDEN. Pinned by `budget is per manufacturer`.

---

### Task 1: Pure calculation module, locked to the guide

**Files:**
- Create: `src/utils/calc.js`
- Test: `src/utils/calc.test.js`
- Modify: `package.json` (vitest dev dep + `"test": "vitest run"`)

**Interfaces:**
- Consumes: nothing (pure, no imports).
- Produces (used by Tasks 2 and 3):
  - `MANUFACTURERS` — `{ bosch: { key: 'bosch', label: 'Bosch INTEGRUS', step: 33 }, taiden: { key: 'taiden', label: 'TAIDEN HCS-5100', step: 25 }, televic: { key: 'televic', label: 'Televic Aladdin RAD25', step: 33 } }`
  - `profileFor(manufacturerKey, televicStep = 33)` → `{ name, step, budget }` where `budget = 99 × step`; televic uses `televicStep`, others their fixed step. `name` is the label above.
  - `calculateDelays(outputs, cableDelay, profile)` → same output shape as today's function in `App.jsx:17-67`, with radiator rows `{ radNr, cableLength, segmentLength, cumulativeLength, delayNs, switchPosition, isOverMax }` and outputs `{ outputNr, totalLength, maxDelay, radiators }`.

- [ ] **Step 1: Install vitest and add the test script**

`npm install -D vitest`, then add `"test": "vitest run"` to `package.json` scripts.

- [ ] **Step 2: Write the failing tests**

Create `src/utils/calc.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { MANUFACTURERS, profileFor, calculateDelays } from './calc.js'

// Guide worked example: daisy chain, tprop 4.0 ns/m,
// totals 25/50/100/200/250 m, global DMAX = 1000 ns
const exampleOutputs = [{
  numRadiators: 5,
  radiators: [{ length: '25' }, { length: '50' }, { length: '100' }, { length: '200' }, { length: '250' }],
}]

describe('profileFor', () => {
  it('derives budget = 99 × step per manufacturer', () => {
    expect(profileFor('bosch')).toMatchObject({ name: 'Bosch INTEGRUS', step: 33, budget: 3267 })
    expect(profileFor('taiden')).toMatchObject({ name: 'TAIDEN HCS-5100', step: 25, budget: 2475 })
    expect(profileFor('televic')).toMatchObject({ step: 33, budget: 3267 })
    expect(profileFor('televic', 25)).toMatchObject({ step: 25, budget: 2475 })
    expect(MANUFACTURERS.televic.step).toBe(33)
  })
})

describe('guide worked example', () => {
  it('Bosch 33 ns: switch 27/24/18/06/00, segments 25/25/50/100/50', () => {
    const rads = calculateDelays(exampleOutputs, 4.0, profileFor('bosch'))[0].radiators
    expect(rads.map(r => r.switchPosition)).toEqual(['27', '24', '18', '06', '00'])
    expect(rads.map(r => r.segmentLength)).toEqual([25, 25, 50, 100, 50])
    expect(rads.map(r => r.cumulativeLength)).toEqual([25, 50, 100, 200, 250])
    expect(rads.map(r => r.delayNs)).toEqual([100, 200, 400, 800, 1000])
  })

  it('TAIDEN 25 ns: switch 36/32/24/08/00', () => {
    const rads = calculateDelays(exampleOutputs, 4.0, profileFor('taiden'))[0].radiators
    expect(rads.map(r => r.switchPosition)).toEqual(['36', '32', '24', '08', '00'])
  })

  it('Televic follows its chosen step: 25 ns matches the TAIDEN column', () => {
    const rads = calculateDelays(exampleOutputs, 4.0, profileFor('televic', 25))[0].radiators
    expect(rads.map(r => r.switchPosition)).toEqual(['36', '32', '24', '08', '00'])
  })

  it('pools all outputs into one global max (Scenario C)', () => {
    const outputs = [
      { numRadiators: 1, radiators: [{ length: '250' }] },
      { numRadiators: 1, radiators: [{ length: '25' }] },
    ]
    // radiator on output 2 references output 1's 1000 ns DMAX
    expect(calculateDelays(outputs, 4.0, profileFor('bosch'))[1].radiators[0].switchPosition).toBe('27')
  })
})

describe('budget flag (was: fixed 576 m rule)', () => {
  it('flags radiator over the manufacturer budget, not a fixed meter limit', () => {
    const out = [{ numRadiators: 1, radiators: [{ length: '600' }] }]
    expect(calculateDelays(out, 5.67, profileFor('bosch'))[0].radiators[0].isOverMax).toBe(true)   // 3402 ns
    expect(calculateDelays(out, 4.0, profileFor('bosch'))[0].radiators[0].isOverMax).toBe(false)  // 2400 ns
  })

  it('budget is per manufacturer', () => {
    const out = [{ numRadiators: 1, radiators: [{ length: '480' }] }]
    expect(calculateDelays(out, 5.67, profileFor('bosch'))[0].radiators[0].isOverMax).toBe(false)  // 2722 ns
    expect(calculateDelays(out, 5.67, profileFor('taiden'))[0].radiators[0].isOverMax).toBe(true)
  })
})

describe('edge cases', () => {
  it('over-budget system: switch may exceed 99 and the long radiator is flagged', () => {
    const out = [{ numRadiators: 2, radiators: [{ length: '' }, { length: '600' }] }]
    const [near, far] = calculateDelays(out, 5.67, profileFor('bosch'))[0].radiators
    expect(near.switchPosition).toBe('103')          // (3402 − 0) / 33
    expect(far.isOverMax).toBe(true)
  })

  it('cable delay 0 or empty lengths: all finite, no NaN', () => {
    const out = [{ numRadiators: 2, radiators: [{ length: '' }, { length: '' }] }]
    calculateDelays(out, 0, profileFor('bosch'))[0].radiators.forEach(r => {
      expect(Number.isFinite(r.delayNs)).toBe(true)
      expect(Number.isFinite(r.segmentLength)).toBe(true)
      expect(r.switchPosition).toBe('00')
    })
  })

  it('non-monotonic totals: negative segment is shown, delay uses the entered total', () => {
    const out = [{ numRadiators: 2, radiators: [{ length: '100' }, { length: '50' }] }]
    const [r1, r2] = calculateDelays(out, 4.0, profileFor('bosch'))[0].radiators
    expect(r2.segmentLength).toBe(-50)
    expect(r2.cumulativeLength).toBe(50)
    expect(r2.delayNs).toBe(200)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run`
Expected: FAIL — cannot resolve `./calc.js`.

- [ ] **Step 4: Implement `src/utils/calc.js`**

Export `MANUFACTURERS`, `profileFor`, `calculateDelays`. The body is the existing `calculateDelays` from `App.jsx:17-67`, moved, with exactly these changes:
1. Signature `(outputs, cableDelay, profile)`; switch formula divides by `profile.step`, so `Math.round((systemMaxDelayNs - localDelayNs) / profile.step)`.
2. `segmentLength`: this radiator's length minus the previous radiator's length (0 for the first radiator on the output).
3. `isOverMax: localDelayNs > profile.budget` (replaces `length > MAX_TRUNK_LENGTH`).
4. `switchPosition: String(Math.round(...)).padStart(2, '0')` — replaces `switchHex: switchPosDec.toString(10)`; drop the now-dead `Math.max(0, ...)` (local delay can never exceed the global max by construction).
5. Keep everything else identical: global max scan across all outputs, `parseFloat(rad.length) || 0`, output `totalLength` = longest run, `maxDelay = totalLength × cableDelay`.
Comment on `profileFor`: budget is 99 switch positions (two decimal dials, 00–99).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/calc.js src/utils/calc.test.js package.json package-lock.json
git commit -m "feat: manufacturer delay profiles with guide-locked calc tests"
```

### Task 2: Selector UI and App rewiring

**Files:**
- Modify: `src/App.jsx` (constants block, state, config card, results table, reset)

**Interfaces:**
- Consumes: `MANUFACTURERS`, `profileFor`, `calculateDelays` from `./utils/calc.js` (Task 1).
- Produces: App state `manufacturer` ('bosch' | 'taiden' | 'televic') and `televicStep` (33 | 25); derived `profile = profileFor(manufacturer, televicStep)`; `ResultsSection` and the PDF call receive `profile`.

- [ ] **Step 1: Rewire the component**

Delete the local `calculateDelays` and all four constants (`DEFAULT_CABLE_DELAY` stays; `MAX_TRUNK_LENGTH`, `THEORETICAL_MAX_DELAY`, `MAX_SWITCH_POSITIONS`, `STEP_SIZE` go). Import from `./utils/calc.js`. Add state `manufacturer` ('bosch') and `televicStep` (33); derive `profile = profileFor(manufacturer, televicStep)` in the component body. `handleCalculate` calls `calculateDelays(outputs, cableDelay, profile)`; `handleReset` also resets `manufacturer` to 'bosch' and `televicStep` to 33. Switching manufacturer does NOT clear any entered data.

- [ ] **Step 2: Add the selector UI in the config card**

Above the cable-delay row, a three-button segmented control using the card's existing Tailwind patterns (rounded-lg border, active = `bg-neutral-900 text-white`, inactive = white/neutral text). Labels: `Bosch INTEGRUS`, `TAIDEN HCS-5100`, `Televic Aladdin RAD25`. When Televic is active, show two small pills to its right: `25 ns` / `33 ns` (same active/inactive styling, smaller). Include the group in a labeled row: "Radiator Manufacturer" with sub-caption "Switch step size follows the manufacturer's delay switch."

- [ ] **Step 3: Make the spec readouts live**

Replace the static readouts: `Theoretical Max Delay: {profile.budget} ns` and `Max Trunk Length: {cableDelay > 0 ? Math.round(profile.budget / cableDelay) : '—'} m`.

- [ ] **Step 4: Update the results table and warnings**

Add a one-line hint under the radiators count row, above the grid: "Enter the total cable length from the transmitter (TX) to each radiator." Segment Length cell shows `rad.segmentLength.toFixed(1) m`; Switch Setting cell shows `rad.switchPosition`; the per-output warning condition becomes `r.maxDelay > profile.budget` with text `Total delay exceeds the {profile.budget} ns switch range. Check cable length.` Pass `profile` to `ResultsSection` as a prop (keep `cableDelay`).

- [ ] **Step 5: Verify build, lint, tests**

Run: `npm run build && npx vitest run && npm run lint`
Expected: all three pass clean.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: manufacturer selector with live step/budget readouts"
```

### Task 3: PDF report reflects the profile

**Files:**
- Modify: `src/utils/generateDelayPdf.js:107-219`, call site in `src/App.jsx`

**Interfaces:**
- Consumes: radiator rows from Task 1 (`rad.switchPosition`), profile `{ name, step, budget }` from Task 2's state.
- Produces: `generateDelayPdf({ results, cableDelay, profile, title })` — the `constants` parameter is removed.

- [ ] **Step 1: Replace `constants` with `profile`**

Header sub-line becomes `{profile.name} · {profile.step} ns steps · Cable X ns/m · Max Y m (Z ns)` (keep the existing `fmt` helpers). Per-output red note condition: `out.maxDelay > profile.budget`, text: `Exceeds {profile.budget} ns switch range — shorten cable.` Footer: `SW = round((system max − local) / {profile.step}).  Set each radiator switch to its SW value.` Replace both `switchHex` references (`drawFlow` SW text, table body) with `switchPosition`. Update the call in `App.jsx` to pass `profile` instead of `constants`.

- [ ] **Step 2: Verify build and tests, eyeball one PDF**

Run: `npm run build && npx vitest run`
Expected: pass. Then `npm run dev`, generate a PDF with the worked-example numbers under Bosch and TAIDEN, and check: header shows the manufacturer + step, footer shows the real step, switches print two-digit.

- [ ] **Step 3: Commit**

```bash
git add src/utils/generateDelayPdf.js src/App.jsx
git commit -m "feat: PDF report states manufacturer, step size and budget"
```
