import { useState, useRef } from 'react'

// ============================================================
// Constants
// ============================================================
const DEFAULT_CABLE_DELAY = 5.67 // ns/m
const MAX_TRUNK_LENGTH = 576 // meters
const THEORETICAL_MAX_DELAY = 3267 // ns
const MAX_SWITCH_POSITIONS = 15 // 0–F hex
const STEP_SIZE = THEORETICAL_MAX_DELAY / MAX_SWITCH_POSITIONS // ~217.8 ns

// ============================================================
// Calculation
// ============================================================
function calculateDelays(outputs, cableDelay) {
  // 1. Find the maximum trunk length across ALL outputs to find the System Max Delay
  // The switch makes all radiators delay to fire at the exact same timestamp as the furthest radiator.
  let maxSystemTrunkLength = 0
  outputs.forEach(output => {
    output.radiators.forEach(rad => {
      const length = parseFloat(rad.length) || 0
      if (length > maxSystemTrunkLength) {
        maxSystemTrunkLength = length
      }
    })
  })

  const systemMaxDelayNs = maxSystemTrunkLength * cableDelay

  // 2. Calculate individual delays and switches
  return outputs.map((output, i) => {
    let outputTotalLength = 0
    const radiators = output.radiators.map((rad, j) => {
      const length = parseFloat(rad.length) || 0

      // The Excel sheet uses direct length (Lm) for the trunk length to that radiator.
      const localDelayNs = length * cableDelay

      // Switch calculation: 
      // Formula: ROUND((SystemMaxDelayNs - LocalDelayNs) / 33, 0)
      const switchPosDec = Math.max(0, Math.round((systemMaxDelayNs - localDelayNs) / 33))

      if (length > outputTotalLength) {
        outputTotalLength = length
      }

      return {
        radNr: j + 1,
        cableLength: length,
        cumulativeLength: length,
        delayNs: localDelayNs,
        switchPosition: switchPosDec,
        switchHex: switchPosDec.toString(10), // The switches use decimal digits
        isOverMax: length > MAX_TRUNK_LENGTH,
      }
    })

    return {
      outputNr: i + 1,
      totalLength: outputTotalLength,
      maxDelay: outputTotalLength * cableDelay,
      radiators,
    }
  })
}

// ============================================================
// Icons
// ============================================================
const BoltIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)
const GearIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const CalcIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
)
const ResetIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)
const WarnIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
)

// ============================================================
// App Component
// ============================================================
function App() {
  const [cableDelay, setCableDelay] = useState(DEFAULT_CABLE_DELAY)
  const [activeTab, setActiveTab] = useState(0)
  const [outputs, setOutputs] = useState(
    Array.from({ length: 6 }, () => ({ numRadiators: 0, radiators: [] }))
  )
  const [results, setResults] = useState(null)
  const resultsRef = useRef(null)

  const handleNumRadiators = (value) => {
    const num = Math.max(0, Math.min(50, parseInt(value) || 0))
    setOutputs(prev => {
      const updated = [...prev]
      const existing = updated[activeTab].radiators
      const radiators = Array.from({ length: num }, (_, i) =>
        existing[i] ? { ...existing[i] } : { length: '' }
      )
      updated[activeTab] = { numRadiators: num, radiators }
      return updated
    })
  }

  const handleLengthChange = (radIndex, value) => {
    setOutputs(prev => {
      const updated = [...prev]
      const radiators = [...updated[activeTab].radiators]
      radiators[radIndex] = { ...radiators[radIndex], length: value }
      updated[activeTab] = { ...updated[activeTab], radiators }
      return updated
    })
  }

  const handleCalculate = () => {
    const res = calculateDelays(outputs, cableDelay)
    setResults(res)
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleReset = () => {
    setCableDelay(DEFAULT_CABLE_DELAY)
    setActiveTab(0)
    setOutputs(Array.from({ length: 6 }, () => ({ numRadiators: 0, radiators: [] })))
    setResults(null)
  }

  const currentOutput = outputs[activeTab]

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 antialiased font-sans selection:bg-blue-200">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 tracking-wide mb-4">
            <BoltIcon />
            INTEGRUS System Tool
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mb-3">
            Delay Switch Calculator
          </h1>
          <p className="text-neutral-500 text-sm max-w-lg">
            Calculate infrared signal propagation delays and switch settings for Bosch INTEGRUS radiators.
          </p>
        </header>

        {/* Global Configuration */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 w-full md:w-max mx-auto mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                <GearIcon />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-900">Cable Signal Delay</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cableDelay}
                    onChange={e => setCableDelay(parseFloat(e.target.value) || DEFAULT_CABLE_DELAY)}
                    className="w-24 px-2 py-1 text-sm border border-neutral-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                  />
                  <span className="text-sm text-neutral-500">ns/m</span>
                </div>
              </div>
            </div>
            <div className="h-px w-full sm:h-10 sm:w-px bg-neutral-200 hidden sm:block"></div>
            <div className="flex flex-col gap-1 text-sm text-neutral-600">
              <div className="flex justify-between gap-4">
                <span>Max Trunk Length:</span>
                <span className="font-semibold text-neutral-900">{MAX_TRUNK_LENGTH} m</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Theoretical Max Delay:</span>
                <span className="font-semibold text-neutral-900">{THEORETICAL_MAX_DELAY} ns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Output Tabs */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm mb-8 overflow-hidden">
          <div className="flex border-b border-neutral-200 overflow-x-auto hide-scrollbar">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex-shrink-0 flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 outline-none
                  ${activeTab === i
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
                  }`}
              >
                Output {i + 1}
                {outputs[i].numRadiators > 0 && (
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === i ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-600'
                    }`}>
                    {outputs[i].numRadiators}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8" key={activeTab}>
            {/* Number of Radiators Input */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 pb-8 border-b border-neutral-100">
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-1">Radiators on Output {activeTab + 1}</label>
                <p className="text-xs text-neutral-500">How many radiators are daisy-chained on this output line?</p>
              </div>
              <input
                type="number"
                min="0"
                max="50"
                value={currentOutput.numRadiators || ''}
                onChange={e => handleNumRadiators(e.target.value)}
                placeholder="0"
                className="w-24 px-3 py-2 text-base border border-neutral-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-center sm:ml-auto"
              />
            </div>

            {/* Cable Lengths Grid */}
            {currentOutput.numRadiators > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentOutput.radiators.map((rad, i) => (
                  <div key={i} className="flex flex-col p-4 border border-neutral-200 rounded-lg bg-neutral-50/50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-neutral-700">Radiator {i + 1}</span>
                      <span className="text-xs font-mono text-neutral-400">RAD-{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={rad.length}
                          onChange={e => handleLengthChange(i, e.target.value)}
                          className="w-full pl-3 pr-8 py-2 text-sm border border-neutral-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 select-none">m</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-neutral-500">Configure radiators to start entering cable lengths.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <button
            onClick={handleCalculate}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <CalcIcon />
            Calculate Delay Switch
          </button>
          <button
            onClick={handleReset}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-colors shadow-sm"
          >
            <ResetIcon />
            Reset All
          </button>
        </div>

        {/* Results Section */}
        <div ref={resultsRef}>
          {results && <ResultsSection results={results} />}
        </div>

      </div>
    </div>
  )
}

// ============================================================
// Results Section
// ============================================================
function ResultsSection({ results }) {
  const activeResults = results.filter(r => r.radiators.length > 0)

  if (activeResults.length === 0) {
    return (
      <div className="p-8 text-center border-t border-neutral-200">
        <p className="text-neutral-500">No output data available. Add radiators to an output to calculate.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 border-t border-neutral-200 pt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Calculation Results</h2>
      </div>

      <div className="grid gap-6">
        {activeResults.map(r => (
          <div key={r.outputNr} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">

            {/* Output Header */}
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                  {r.outputNr}
                </span>
                <h3 className="text-lg font-semibold text-neutral-900">Output {r.outputNr}</h3>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-500 uppercase tracking-wide">Total Cable Length</span>
                  <span className="font-mono font-semibold text-neutral-900">{r.totalLength.toFixed(1)} m</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-500 uppercase tracking-wide">Max Delay</span>
                  <span className={`font-mono font-semibold ${r.maxDelay > THEORETICAL_MAX_DELAY ? 'text-red-600' : 'text-neutral-900'}`}>
                    {r.maxDelay.toFixed(1)} ns
                  </span>
                </div>
              </div>
            </div>

            {/* Warning if exceeded max delay */}
            {r.maxDelay > THEORETICAL_MAX_DELAY && (
              <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2 text-red-700 text-sm font-medium">
                <WarnIcon />
                Total delay exceeds theoretical maximum of {THEORETICAL_MAX_DELAY} ns. Check cable length.
              </div>
            )}

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-600">
                <thead className="bg-white border-b border-neutral-200 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Radiator</th>
                    <th className="px-6 py-4 font-semibold">Segment Length</th>
                    <th className="px-6 py-4 font-semibold">Total Length</th>
                    <th className="px-6 py-4 font-semibold">Calculated Delay</th>
                    <th className="px-6 py-4 font-semibold">Switch Setting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {r.radiators.map(rad => (
                    <tr key={rad.radNr} className={`hover:bg-neutral-50 transition-colors ${rad.isOverMax ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-neutral-900">RAD-{String(rad.radNr).padStart(2, '0')}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono">{rad.cableLength.toFixed(1)} m</td>
                      <td className={`px-6 py-4 whitespace-nowrap font-mono ${rad.isOverMax ? 'text-red-600 font-semibold' : ''}`}>
                        {rad.cumulativeLength.toFixed(1)} m
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap font-mono ${rad.isOverMax ? 'text-red-600 font-semibold' : ''}`}>
                        {rad.delayNs.toFixed(1)} ns
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-md border font-mono font-bold ${rad.isOverMax
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-white border-neutral-300 text-neutral-900 shadow-sm'
                          }`}>
                          {rad.switchHex}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}

export default App