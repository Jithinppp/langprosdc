// Delay switch math per the IR Radiator Delay Compensation Reference Guide:
// switch = round((global max delay − local delay) / step), budget = 99 × step.

export const MANUFACTURERS = {
  bosch: { key: 'bosch', label: 'Bosch INTEGRUS', step: 33 },
  taiden: { key: 'taiden', label: 'TAIDEN HCS-5100', step: 25 },
  televic: { key: 'televic', label: 'Televic Aladdin RAD25', step: 33 },
}

// Budget is 99 switch positions (two decimal dials, 00–99) times the step.
// Televic chassis exist in both 25 ns and 33 ns calibrations; televicStep picks one.
export function profileFor(manufacturerKey, televicStep = 33) {
  const m = MANUFACTURERS[manufacturerKey]
  const step = manufacturerKey === 'televic' ? televicStep : m.step
  return { name: m.label, step, budget: 99 * step }
}

export function calculateDelays(outputs, cableDelay, profile) {
  // 1. Sum each daisy chain into cumulative runs and find the global max run.
  // The switch makes all radiators delay to fire at the same timestamp as the furthest radiator.
  let maxSystemTrunkLength = 0
  const runs = outputs.map(output => {
    let cumulative = 0
    return output.radiators.map(rad => {
      const segment = parseFloat(rad.length) || 0
      cumulative += segment
      if (cumulative > maxSystemTrunkLength) {
        maxSystemTrunkLength = cumulative
      }
      return { segment, cumulative }
    })
  })

  const systemMaxDelayNs = maxSystemTrunkLength * cableDelay

  // 2. Calculate individual delays and switches against the global max.
  return outputs.map((output, i) => {
    let outputTotalLength = 0
    const radiators = runs[i].map((row, j) => {
      const localDelayNs = row.cumulative * cableDelay

      // Switch: ROUND((SystemMaxDelayNs − LocalDelayNs) / step), two decimal dials.
      const switchPosition = String(Math.round((systemMaxDelayNs - localDelayNs) / profile.step)).padStart(2, '0')

      if (row.cumulative > outputTotalLength) {
        outputTotalLength = row.cumulative
      }

      return {
        radNr: j + 1,
        segmentLength: row.segment,
        cumulativeLength: row.cumulative,
        delayNs: localDelayNs,
        switchPosition,
        isOverMax: localDelayNs > profile.budget,
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
