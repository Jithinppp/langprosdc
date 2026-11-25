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
  // 1. Find the maximum trunk length across ALL outputs to find the System Max Delay.
  // The switch makes all radiators delay to fire at the same timestamp as the furthest radiator.
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

  // 2. Calculate individual delays and switches.
  return outputs.map((output, i) => {
    let outputTotalLength = 0
    let previousLength = 0
    const radiators = output.radiators.map((rad, j) => {
      const length = parseFloat(rad.length) || 0

      // Input is the total cable length from TX to the radiator (guide Scenario A),
      // so the local delay follows directly from it.
      const localDelayNs = length * cableDelay

      // Switch: ROUND((SystemMaxDelayNs − LocalDelayNs) / step), two decimal dials.
      const switchPosition = String(Math.round((systemMaxDelayNs - localDelayNs) / profile.step)).padStart(2, '0')

      // Segment between this radiator and the previous one on the daisy chain.
      const segmentLength = j === 0 ? length : length - previousLength

      if (length > outputTotalLength) {
        outputTotalLength = length
      }
      previousLength = length

      return {
        radNr: j + 1,
        cableLength: length,
        segmentLength,
        cumulativeLength: length,
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
