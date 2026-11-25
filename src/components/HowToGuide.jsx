import { useCallback, useEffect, useRef } from 'react'

// LANGPROS icon reused from App; the guide mounts inside the same page so it
// can import the shared asset without coupling to App's markup.
import icon from '../assets/icon.png'

const ChevronLeftIcon = () => (
  <svg
    className="w-4 h-4 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
)

const HelpIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export function HowToGuide({ onBack }) {
  const headingRef = useRef(null)

  // Move focus into the guide on open so screen readers land at the title.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [])

  // Escape returns to the calculator without touching any calculation state.
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onBack()
      }
    },
    [onBack]
  )
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const backLabel = 'Back to calculator'
  const startLabel = 'Start calculating'

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 antialiased font-sans selection:bg-blue-200">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Guide header */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3 sm:order-last">
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors print:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <ChevronLeftIcon />
              {backLabel}
            </button>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-1 text-md font-semibold tracking-wider">
            <img src={icon} alt="LANGPROS" className="w-8 h-8" />
            LANGPROS
          </div>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl sm:text-2xl font-bold tracking-tight text-neutral-900 mb-3 sm:mb-0">
            How to calculate delay switches
          </h1>
        </header>

        <p className="text-neutral-500 text-sm mb-10 max-w-lg">
          A step-by-step guide to entering cable segments, reading results, and
          downloading your delay calculation as a PDF field report.
        </p>

        {/* Quick path */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-neutral-900 mb-3">Quick path</h2>
          <ol className="list-decimal list-inside pl-4 space-y-2 text-neutral-700">
            <li>Choose the radiator manufacturer and Televic switch step.</li>
            <li>Set the cable signal delay in ns/m.</li>
            <li>Open an output tab and enter how many radiators it feeds.</li>
            <li>Enter each segment length from the previous radiator.</li>
            <li>Click Calculate Delay Switch.</li>
            <li>Download the delay calculation as a PDF.</li>
          </ol>
        </section>

        {/* Steps */}
        <section className="mb-10 space-y-8">
          {/* Manufacturer */}
          <section className="space-y-3 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-neutral-900">1. Choose the manufacturer and switch step</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Select Bosch INTEGRUS, TAIDEN HCS-5100, or Televic Aladdin RAD25.
              For Televic, also pick the chassis's switch step: 25 ns or 33 ns
              (Televic defaults to 33 ns). This fixes the switch step and the
              delay budget used for every calculation.
            </p>
          </section>

          {/* Cable delay */}
          <section className="space-y-3 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-neutral-900">2. Set the cable signal delay</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Enter the propagation delay of your cable in ns/m from the
              manufacturer's data. The default is 5.67 ns/m.
            </p>
            <ul className="list-disc list-inside pl-4 text-neutral-600 text-sm space-y-1">
              <li>
                <strong>Max Trunk Length</strong> is calculated as budget ÷
                cable delay and shown in metres.
              </li>
              <li>
                <strong>Theoretical Max Delay</strong> is the full switch
                budget: 99 × step in nanoseconds.
              </li>
            </ul>
          </section>

          {/* Output */}
          <section className="space-y-3 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-neutral-900">3. Configure an output</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Use the Output 1–6 tabs and enter how many radiators are
              daisy-chained on that output line (0–50 radiators). Every
              populated output shares one system maximum delay.
            </p>
          </section>

          {/* Segment lengths */}
          <section className="space-y-3 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-neutral-900">4. Enter segment lengths</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Each field holds the segment <em>since the previous point</em>,
              not the total from the transmitter:
            </p>
            <ul className="list-disc list-inside pl-4 text-neutral-600 text-sm space-y-1">
              <li>RAD-01: length from TX to RAD-01.</li>
              <li>RAD-02: length from RAD-01 to RAD-02 only.</li>
              <li>RAD-03: length from RAD-02 to RAD-03 only.</li>
            </ul>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Example — enter <span className="font-mono">25 / 50 / 30 m</span>
              across three fields and the app computes totals of
              <span className="font-mono">25 / 75 / 105 m</span>. Totals are
              calculated automatically and feed the delay and switch math.
            </p>
          </section>

          {/* Calculate */}
          <section className="space-y-3 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-neutral-900">5. Calculate and read results</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Click Calculate Delay Switch. The results table shows, per
              radiator:
            </p>
            <ul className="list-disc list-inside pl-4 text-neutral-600 text-sm space-y-1">
              <li>
                <strong>Segment Length</strong> — what you typed for that field.
              </li>
              <li>
                <strong>Total Length</strong> — the computed run from TX to
                that radiator.
              </li>
              <li>
                <strong>Calculated Delay</strong> — total length × cable delay
                in ns.
              </li>
              <li>
                <strong>Switch Setting</strong> — a two-digit decimal value
                such as 06, derived from the global maximum delay across all
                outputs divided by the manufacturer step.
              </li>
            </ul>
          </section>

          {/* Warnings */}
          <section className="space-y-3 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-neutral-900">6. Handle warnings</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Red rows and the output warning mean a radiator's local delay is
              greater than the manufacturer budget (99 × step). Shorten the run
              or correct the inputs before setting the physical switches.
            </p>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Values above 99 can appear for over-budget systems. These are
              diagnostics only — they cannot be set on a two-digit physical
              switch, so the installation must be corrected.
            </p>
          </section>

          {/* Download */}
          <section className="space-y-3 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-neutral-900">7. Download the delay calculation</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Optionally edit the PDF title (up to 80 characters) and click
              Download Delay PDF.
            </p>
            <p className="text-neutral-600 text-sm leading-relaxed">
              The report includes your selected manufacturer and step size,
              cable delay, global maximum length and delay, the cable-flow
              diagram, the per-radiator settings table, and the exact switch
              formula used. The file is saved locally as
              <span className="font-mono">{'-title-YYYY-MM-DD.pdf'}</span>.
            </p>
            <p className="text-neutral-600 text-sm leading-relaxed">
              The manufacturer and step are captured when you click Calculate.
              Recalculate after changing either the profile or the cable delay
              before exporting.
            </p>
          </section>
        </section>

        {/* Control reference */}
        <section className="mb-10 print:break-inside-avoid">
          <h2 className="text-xl font-semibold text-neutral-900 mb-3">Control reference</h2>
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="bg-white border-b border-neutral-200 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Control</th>
                <th className="px-6 py-4 font-semibold">What it does</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Radiator Manufacturer
                </td>
                <td className="px-6 py-4">Bosch INTEGRUS, TAIDEN HCS-5100, or Televic Aladdin RAD25.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Televic switch step
                </td>
                <td className="px-6 py-4">25 ns or 33 ns sub-option shown only when Televic is selected.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Cable Signal Delay
                </td>
                <td className="px-6 py-4">Propagation delay in ns/m (default 5.67 ns/m).</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Max Trunk Length
                </td>
                <td className="px-6 py-4">Budget ÷ cable delay, shown in metres; live readout.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Theoretical Max Delay
                </td>
                <td className="px-6 py-4">Full switch budget: 99 × step in ns.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Output tabs
                </td>
                <td className="px-6 py-4">Output 1–6; each supports up to 50 radiators and shares one system maximum.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Radiators on Output
                </td>
                <td className="px-6 py-4">Number of radiators daisy-chained on the selected output.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Segment fields
                </td>
                <td className="px-6 py-4">Length from the previous radiator (or TX for RAD-01); totals calculated automatically.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Calculate Delay Switch
                </td>
                <td className="px-6 py-4">Computes delays and switch settings; snapshots the manufacturer and step so reports match their numbers.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Reset All
                </td>
                <td className="px-6 py-4">Restores Bosch at 33 ns, default cable delay, and clears outputs and results.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  PDF title
                </td>
                <td className="px-6 py-4">Optional report title, up to 80 characters.</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                  Download Delay PDF
                </td>
                <td className="px-6 py-4">Generates and saves the field report PDF locally.</td>
              </tr>
            </tbody>
          </table>
        </div>
        </section>

        {/* Worked example */}
        <section className="mb-10 space-y-3 print:break-inside-avoid">
          <h2 className="text-xl font-semibold text-neutral-900 mb-3">Worked example</h2>
          <p className="text-neutral-600 text-sm leading-relaxed">
            Bosch INTEGRUS, 33 ns step, cable delay 4.0 ns/m, segments
            <span className="font-mono">25 / 25 / 50 / 100 / 50 m</span>:
          </p>
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="bg-white border-b border-neutral-200 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Radiator</th>
                <th className="px-6 py-4 font-semibold">Segment entered</th>
                <th className="px-6 py-4 font-semibold">Computed total</th>
                <th className="px-6 py-4 font-semibold">Bosch switch</th>
                <th className="px-6 py-4 font-semibold">TAIDEN / Televic 25 ns switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="px-6 py-4 font-medium text-neutral-900">RAD-01</td>
                <td className="px-6 py-4 font-mono">25 m</td>
                <td className="px-6 py-4 font-mono">25 m</td>
                <td className="px-6 py-4 font-mono font-bold">27</td>
                <td className="px-6 py-4 font-mono font-bold">36</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-neutral-900">RAD-02</td>
                <td className="px-6 py-4 font-mono">25 m</td>
                <td className="px-6 py-4 font-mono">50 m</td>
                <td className="px-6 py-4 font-mono font-bold">24</td>
                <td className="px-6 py-4 font-mono font-bold">32</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-neutral-900">RAD-03</td>
                <td className="px-6 py-4 font-mono">50 m</td>
                <td className="px-6 py-4 font-mono">100 m</td>
                <td className="px-6 py-4 font-mono font-bold">18</td>
                <td className="px-6 py-4 font-mono font-bold">24</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-neutral-900">RAD-04</td>
                <td className="px-6 py-4 font-mono">100 m</td>
                <td className="px-6 py-4 font-mono">200 m</td>
                <td className="px-6 py-4 font-mono font-bold">06</td>
                <td className="px-6 py-4 font-mono font-bold">08</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-neutral-900">RAD-05</td>
                <td className="px-6 py-4 font-mono">50 m</td>
                <td className="px-6 py-4 font-mono">250 m</td>
                <td className="px-6 py-4 font-mono font-bold">00</td>
                <td className="px-6 py-4 font-mono font-bold">00</td>
              </tr>
            </tbody>
          </table>
        </div>
        </section>

        {/* Bottom navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 print:hidden">
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <ChevronLeftIcon /> {backLabel}
          </button>
          <button
            type="button"
            onClick={onBack}
            aria-label={startLabel}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-colors shadow-sm"
          >
            {startLabel}
          </button>
        </div>
      </div>
    </main>
  )
}
