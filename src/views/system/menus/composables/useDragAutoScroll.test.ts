import { describe, expect, it } from 'vitest'
import { calculateDragScrollDelta } from './useDragAutoScroll'

describe('calculateDragScrollDelta', () => {
  const bounds = { top: 100, bottom: 500 }

  it('scrolls upward near or beyond the top edge', () => {
    expect(calculateDragScrollDelta(100, bounds)).toBeLessThan(0)
    expect(calculateDragScrollDelta(80, bounds)).toBe(-20)
  })

  it('scrolls downward near or beyond the bottom edge', () => {
    expect(calculateDragScrollDelta(490, bounds)).toBeGreaterThan(0)
    expect(calculateDragScrollDelta(520, bounds)).toBe(20)
  })

  it('does not scroll in the center area', () => {
    expect(calculateDragScrollDelta(300, bounds)).toBe(0)
  })
})
