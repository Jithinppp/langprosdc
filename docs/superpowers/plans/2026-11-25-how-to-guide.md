# In-app How-to Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small How-to entry point that opens a complete, accessible in-app guide and returns to the calculator without losing work.

**Architecture:** A local `view` state in `App.jsx` swaps between the existing calculator and a new `HowToGuide` component. Calculation state stays mounted; the guide owns only presentation, focus handling, and navigation back.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 4, existing Vitest suite.

**Spec:** `docs/superpowers/specs/2026-11-25-how-to-guide-design.md`

## Global Constraints

- No separate URL, router, deep link, or new browser history entry.
- No changes to delay math, manufacturer profiles, budgets, PDF generation, or persistence.
- No new runtime dependency, component-test framework, or backend.
- React 19 + Vite 7 + Tailwind CSS 4, matching the existing app.
- Accessible semantics and keyboard operation are required.
- Guide copy must match `src/utils/calc.js`, `src/App.jsx`, and `src/utils/generateDelayPdf.js`.

## Review Focus

1. **Keyboard flow:** How to opens with Enter/Space, guide heading receives focus, Escape returns, and focus restores to the How-to link. Pinned by the keyboard checklist in Task 1, Step 6.
2. **State preservation:** navigating to the guide and back keeps manufacturer, cable delay, outputs, segment inputs, results, and PDF title intact. Pinned by the state checklist in Task 1, Step 6.
3. **Mobile readability:** guide cards and reference table remain usable at narrow widths without horizontal page scrolling. Pinned by the responsive checklist in Task 1, Step 6.
4. **Copy completeness and accuracy:** every visible calculator control is explained, segment inputs are not described as totals, and the final PDF section covers title and download. Pinned by the content checklist in Task 1, Step 6.
5. **Print behavior:** guide content prints while navigation buttons are hidden. Pinned by the print checklist in Task 1, Step 6.

---

### Task 1: Build and wire the full-page guide

**Files:**
- Create: `src/components/HowToGuide.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: existing calculator state and `handleBackToCalculator` callback from `App.jsx`.
- Produces: `HowToGuide({ onBack })`, where `onBack: () => void` returns to the calculator.
- App state adds `view: 'calculator' | 'guide'` and `howToLinkRef`; existing calculation state and handlers are unchanged.

- [ ] **Step 1: Create the guide component and focus behavior**

Create `src/components/HowToGuide.jsx` exporting `HowToGuide({ onBack })`.

Requirements:
- Render a full-page `<main>` with a compact LANGPROS header, a **Back to calculator** button, and an `<h1 tabIndex={-1}>` titled `How to calculate delay switches`.
- On mount, focus the heading and scroll to the top.
- Listen for Escape and call `onBack`; clean up the listener on unmount.
- Include a final **Start calculating** button that calls `onBack`.
- Hide navigation buttons in print with Tailwind `print:hidden`; keep guide content visible and avoid card breaks with `print:break-inside-avoid`.

- [ ] **Step 2: Write the workflow and control-reference content**

In `HowToGuide.jsx`, add these sections in order:

1. **Quick path:** Manufacturer → Cable delay → Output & radiators → Segment lengths → Calculate → Download PDF.
2. **Choose the manufacturer and step:** Bosch INTEGRUS 33 ns; TAIDEN HCS-5100 25 ns; Televic Aladdin RAD25 25 or 33 ns; Televic defaults to 33 ns.
3. **Set cable signal delay:** default `5.67 ns/m`; explain that Max Trunk Length is `budget ÷ cable delay` and Theoretical Max Delay is `99 × step`.
4. **Configure an output:** Output 1–6 tabs; 0–50 radiators per output.
5. **Enter segment lengths:** RAD-01 is TX→RAD-01; later fields are previous radiator→current radiator. Show `25 / 50 / 30 m` producing totals `25 / 75 / 105 m`.
6. **Calculate and read results:** explain Segment Length, Total Length, Calculated Delay, and Switch Setting; settings are decimal and zero-padded.
7. **Handle warnings:** red rows/output warning mean local delay exceeds `99 × step`; settings above 99 are diagnostic and must not be set on the physical switch.
8. **Download the delay calculation:** optional PDF title (80 characters max), **Download Delay PDF**, report contents, and `<slug>-<YYYY-MM-DD>.pdf` filename.

Add a **Control reference** table covering: Radiator Manufacturer, Televic step pills, Cable Signal Delay, Max Trunk Length, Theoretical Max Delay, Output tabs, Radiators on Output, segment fields, Calculate Delay Switch, Reset All, PDF title, Download Delay PDF.

Add a **Worked example** using segments `25 / 25 / 50 / 100 / 50 m`, cable delay `4.0 ns/m`, Bosch switches `27 / 24 / 18 / 06 / 00`, and TAIDEN/Televic 25 ns switches `36 / 32 / 24 / 08 / 00`.

Add a short note: manufacturer/step are snapshotted at Calculate; recalculate after changing either the profile or cable delay before exporting.

- [ ] **Step 3: Add guide state and navigation to `App.jsx`**

In `src/App.jsx`:
- Import `useCallback` and `HowToGuide`.
- Add `view` state initialized to `'calculator'` and `howToLinkRef`.
- Add stable `handleOpenGuide` and `handleBackToCalculator` callbacks. Opening sets `view` to `'guide'` and scrolls to top. Returning sets `view` to `'calculator'` and restores focus to `howToLinkRef` after render.
- Before the calculator return, render `<HowToGuide onBack={handleBackToCalculator} />` when `view === 'guide'`.
- Keep every existing calculation state hook, handler, result snapshot, and PDF path unchanged.

- [ ] **Step 4: Add the small How-to link under the hero description**

In the calculator header, directly below the existing description paragraph, add a real `<button type="button" ref={howToLinkRef} onClick={handleOpenGuide}>` labelled **How to**.

Style it as a small inline text link with a help/book icon, blue text, hover underline, and visible keyboard focus. It must not resemble a primary action or shift the calculator layout noticeably.

- [ ] **Step 5: Run automated verification**

Run:

```bash
npm run build && npm test && npm run lint && git diff --check
```

Expected: build succeeds, all 11 existing tests pass, lint is clean, and the diff has no whitespace errors.

- [ ] **Step 6: Run the manual acceptance checklist**

With the dev server running, verify:

- **Keyboard:** Tab reaches How to; Enter/Space opens it; heading is focused; Escape returns; focus is back on How to.
- **State:** enter values and calculate, open the guide, return, and confirm all inputs/results/PDF title remain intact.
- **Mobile:** at a narrow viewport, guide text, cards, and table remain readable without horizontal page scrolling.
- **Content:** all 12 controls in the reference table are present; segment semantics and both worked-example switch columns match the spec.
- **Print:** browser print preview shows guide content and hides Back/Start calculating controls.

If no browser automation tool is available, record the visual/keyboard checks as deferred to user acceptance rather than claiming they passed.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/components/HowToGuide.jsx
git commit -m "feat: add full-page how-to guide"
```
