# LANGPROS — IR Radiator Delay Switch Calculator

A browser-based calculator for infrared radiator installations. Enter the cable segments in a daisy chain, and the app computes cumulative cable lengths, signal delays, decimal switch settings, and budget warnings for **Bosch INTEGRUS**, **TAIDEN HCS-5100**, and **Televic Aladdin RAD25** systems. Results can be downloaded as a PDF field report.

> **Input model:** every radiator field is a **segment length**, not a total from the transmitter. The app sums the segments automatically. For example, if TX → RAD-01 is 25 m and RAD-01 → RAD-02 is 50 m, enter `25` for RAD-01 and `50` for RAD-02. RAD-02's computed total is `75 m`.

## Features

- Bosch, TAIDEN, and Televic manufacturer profiles
- Televic 25 ns / 33 ns switch-step selection
- Six output tabs, each supporting up to 50 daisy-chained radiators
- Segment-length inputs with automatic cumulative totals
- Live maximum trunk length and theoretical maximum delay readouts
- Per-radiator delay and two-digit decimal switch settings
- Manufacturer-specific 99-position budget checks
- PDF report export with cable flow, settings, and calculation footer
- No backend, account, or database — calculations stay in the browser

## Supported profiles

The decimal switch has positions `00`–`99`, so the available delay budget is `99 × step`.

| Manufacturer | Step size | Delay budget | Notes |
|---|---:|---:|---|
| Bosch INTEGRUS | 33 ns | 3267 ns | Default profile |
| TAIDEN HCS-5100 | 25 ns | 2475 ns | — |
| Televic Aladdin RAD25 | 25 ns | 2475 ns | Select the 25 ns sub-option |
| Televic Aladdin RAD25 | 33 ns | 3267 ns | Televic default |

The **Max Trunk Length** readout is calculated from the selected profile's budget and the cable signal delay: `budget ÷ cable delay`, rounded for display. It is not a fixed meter limit.

## Quick start

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- npm

### Run locally

```bash
git clone https://github.com/Jithinppp/langprosdc.git
cd langprosdc
npm install
npm run dev
```

Open the local URL printed in the terminal, typically `http://localhost:5173`.

### Production build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`.

## How to use

1. **Select the radiator manufacturer.**
   Choose Bosch INTEGRUS, TAIDEN HCS-5100, or Televic Aladdin RAD25. For Televic, also select the chassis's **25 ns** or **33 ns** switch step.

2. **Set the cable signal delay.**
   Enter the propagation delay in `ns/m` from the cable manufacturer's data. The default is `5.67 ns/m`. The live readouts update immediately.

3. **Choose an output.**
   Use the Output 1–6 tabs and enter how many radiators are daisy-chained on that output line.

4. **Enter segment lengths.**
   - RAD-01: length from TX to the first radiator
   - RAD-02: length from RAD-01 to RAD-02 only
   - RAD-03: length from RAD-02 to RAD-03 only
   - Continue in physical cable order

   Example:

   | Connection | Value to enter |
   |---|---:|
   | TX → RAD-01 | 25 m |
   | RAD-01 → RAD-02 | 50 m |
   | RAD-02 → RAD-03 | 30 m |

   The app computes totals of `25 m`, `75 m`, and `105 m`.

5. **Repeat for other outputs if needed.**
   Every populated output participates in one shared system maximum.

6. **Click `Calculate Delay Switch`.**
   The results section shows each radiator's typed segment, computed total, calculated delay, and switch setting.

7. **Review budget warnings.**
   Red rows and the output warning indicate that a local delay exceeds the selected manufacturer's switch budget. Shorten the run or correct the inputs before setting the physical switches.

8. **Download the field report.**
   Optionally change the PDF title, then click `Download Delay PDF`. The report includes the selected profile, cable delay, global maximum, cable-flow diagram, settings table, and formula footer.

`Reset All` restores Bosch at 33 ns, the default `5.67 ns/m` cable delay, and clears all outputs and results.

## Worked example

Using the reference guide's segment layout:

- Manufacturer: **Bosch INTEGRUS**, 33 ns step
- Cable delay: **4.0 ns/m**
- Segments: **25 / 25 / 50 / 100 / 50 m**

| Radiator | Segment entered | Computed total | Delay | Bosch switch | TAIDEN / Televic 25 ns switch |
|---|---:|---:|---:|---:|---:|
| RAD-01 | 25 m | 25 m | 100 ns | `27` | `36` |
| RAD-02 | 25 m | 50 m | 200 ns | `24` | `32` |
| RAD-03 | 50 m | 100 m | 400 ns | `18` | `24` |
| RAD-04 | 100 m | 200 m | 800 ns | `06` | `08` |
| RAD-05 | 50 m | 250 m | 1000 ns | `00` | `00` |

Bosch and Televic at 33 ns use the same step, so they produce the same settings in this example.

## Calculation rules

All arithmetic is performed in [`src/utils/calc.js`](src/utils/calc.js).

```text
cumulative total[n] = sum of segments from RAD-01 through RAD-n
local delay[n]     = cumulative total[n] × cable delay
system max delay   = largest cumulative total across all outputs × cable delay
switch[n]          = round((system max delay − local delay[n]) ÷ step)
budget             = 99 × step
```

Additional behavior:

- Switch settings are decimal and padded to two digits, such as `06`.
- Empty segment fields count as `0 m`; the chain keeps summing.
- Negative segments are accepted and reduce the cumulative total. They are physically invalid for cable length, so treat them as a visible input-error signal.
- All six outputs share one global maximum. This matches the guide's pooled-output scenario.
- Over-budget settings are **not clamped to 99**. A value such as `103` remains visible so the invalid installation is obvious.
- A radiator is flagged when its local delay is greater than the manufacturer budget.

### Result/profile snapshot

The manufacturer and step are captured when you click **Calculate**. Changing the selector afterward does not relabel or corrupt the existing results or PDF. The cable-delay field is not part of that snapshot, so recalculate after changing either the profile or the cable delay before exporting.

## PDF report

Reports are generated locally in the browser and saved as `<title>-<YYYY-MM-DD>.pdf`. Each report includes:

- Report title and date
- Manufacturer and switch step
- Cable signal delay
- Global maximum cable length and delay
- Per-output totals and radiator cable flow
- Radiator, delay, and switch-setting table
- The exact switch formula used
- Red highlighting for over-budget radiators

The title field accepts up to 80 characters.

## Development

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest suite once |
| `npm run lint` | Run ESLint |

### Project structure

```text
src/
├── App.jsx                     # UI state, controls, and results
├── index.css                   # Application styles
├── main.jsx                    # React entry point
└── utils/
    ├── calc.js                 # Manufacturer profiles and delay math
    ├── calc.test.js            # Guide-locked and edge-case tests
    └── generateDelayPdf.js     # PDF report generation
```

Keep delay calculations in `calc.js` so they remain pure and testable. The current suite locks the guide's worked example, manufacturer budgets, pooled outputs, over-budget behavior, empty segments, and negative segments.

## Known limitations

- **Separate rooms:** all outputs are pooled into one global maximum. If two outputs feed separate rooms with independent radiator switches, the shorter room can receive over-delayed settings. Calculate each room separately when the guide requires independent maximums.
- **No persistence:** inputs and results are held in memory only. Reloading the page or using `Reset All` clears them.
- **Verify the cable:** the selected `ns/m` value directly scales every delay. Use the cable manufacturer's propagation data rather than assuming the default is correct for every installation.
- **Over-budget results are diagnostics:** the app reports settings beyond `99` instead of hiding them. Those values cannot be set on a two-digit physical switch; the installation must be corrected.
