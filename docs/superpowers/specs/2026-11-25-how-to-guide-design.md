# In-app How-to guide — design (short)

Date: 2026-11-25

## Intent

Give technicians a clear, self-contained guide directly from the calculator. A small **How to** link under the hero description opens a full-page guide that explains the complete workflow, every control, how to interpret results and warnings, and how to download the final delay report.

## Goals

1. Add an obvious but understated **How to** link below the hero description.
2. Open a readable, responsive, full-page guide inside the existing app.
3. Explain manufacturer/step selection, cable delay, outputs, radiator count, segment inputs, Calculate, Reset, results, warnings, PDF title, and Download Delay PDF.
4. Make the segment-input model unmistakable, with a worked example.
5. End the guide with the PDF-download workflow and report contents.
6. Preserve all calculator inputs and results when moving between guide and calculator.

## Non-goals

- No separate URL, router, deep link, or new browser history entry.
- No changes to delay math, manufacturer profiles, budgets, PDF generation, or persistence.
- No new runtime dependency, component-test framework, or backend.

## Constraints

- React 19 + Vite 7 + Tailwind CSS 4, matching the existing app.
- No existing router/modal system; use local React state.
- Keep the calculator's visual language: neutral surfaces, blue accents, rounded cards, compact controls.
- Accessible semantics and keyboard operation are required.

## Approaches

- **A — full-page in-app view (picked):** local `view` state swaps the calculator for a guide component; Back returns to the calculator with state intact. Matches the user's request for a page, avoids routing, and gives long instructions room on mobile and in print.
- **B — modal/drawer:** quicker return to the calculator, but long content is cramped, focus trapping is more complex, and printing is awkward.
- **C — separate `/how-to` URL:** shareable and bookmarkable, but requires routing/history/static-host handling that this single-page tool does not otherwise need.

## Design calls

- Add `src/components/HowToGuide.jsx` rather than growing `App.jsx` with a second full page of static content.
- Add a `view` state (`calculator` / `guide`) in `App.jsx`; the existing calculation state remains mounted and unchanged.
- The hero link is a real `<button>` styled as a small text link, labelled **How to**, with a help/book icon and visible focus state.
- The guide has:
  - a compact app header and **Back to calculator** button;
  - a one-line quick path: Manufacturer → Cable delay → Output & radiators → Segment lengths → Calculate → Download PDF;
  - numbered workflow sections;
  - a control-reference table covering every button and input;
  - a segment-input example and the guide-locked 25/25/50/100/50 worked example;
  - results/warnings interpretation;
  - a final PDF-download section listing report contents and filename behavior;
  - a **Start calculating** button that returns to the calculator.
- On open, move focus to the guide heading and scroll to the top. Escape and both return buttons go back; focus returns to the How-to link.
- Use responsive single-column cards/tables that stack cleanly on narrow screens. Include print-friendly styling so the guide can be printed without navigation controls.
- No new calculation behavior; guide copy must match `src/utils/calc.js`, `src/App.jsx`, and `src/utils/generateDelayPdf.js`.

## Verification

- `npm run build`, `npm test` (11 existing pure-function tests), and `npm run lint`.
- Manual keyboard check: open with Enter/Space, heading receives focus, Escape returns, focus restores to How to.
- Manual content check: each visible calculator control is explained; final section covers PDF title and Download Delay PDF.
- No component-test framework added, per existing project constraint.
