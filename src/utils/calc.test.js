import { describe, it, expect } from 'vitest'
import { MANUFACTURERS, profileFor, calculateDelays } from './calc.js'

// Guide worked example, segment inputs: "Output → R1 = 25 m, R1 → R2 = 25 m,
// R2 → R3 = 50 m, R3 → R4 = 100 m, R4 → R5 = 50 m" at tprop 4.0 ns/m,
// giving totals 25/50/100/200/250 m and a global DMAX of 1000 ns
const exampleOutputs = [{
  numRadiators: 5,
  radiators: [{ length: '25' }, { length: '25' }, { length: '50' }, { length: '100' }, { length: '50' }],
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

  it('negative segment: shown as-is, reduces the total', () => {
    const out = [{ numRadiators: 2, radiators: [{ length: '100' }, { length: '-25' }] }]
    const [, r2] = calculateDelays(out, 4.0, profileFor('bosch'))[0].radiators
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
})
