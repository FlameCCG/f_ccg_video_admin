/**
 * useMotion composable tests
 * Tests for motion presets and reduced motion support
 */
import { describe, it, expect } from 'vitest'
import { motionPresets, getStaggerDelay, createStaggerVariants } from './useMotion'

describe('useMotion', () => {
  describe('motionPresets', () => {
    it('should have fadeIn preset with correct structure', () => {
      expect(motionPresets.fadeIn).toBeDefined()
      expect(motionPresets.fadeIn.initial).toEqual({ opacity: 0 })
      expect(motionPresets.fadeIn.enter).toBeDefined()
      expect(motionPresets.fadeIn.enter?.opacity).toBe(1)
    })

    it('should have slideUp preset with correct structure', () => {
      expect(motionPresets.slideUp).toBeDefined()
      expect(motionPresets.slideUp.initial).toEqual({ opacity: 0, y: 24 })
      expect(motionPresets.slideUp.enter?.y).toBe(0)
    })

    it('should have slideDown preset with correct structure', () => {
      expect(motionPresets.slideDown).toBeDefined()
      expect(motionPresets.slideDown.initial).toEqual({ opacity: 0, y: -24 })
    })

    it('should have slideLeft preset with correct structure', () => {
      expect(motionPresets.slideLeft).toBeDefined()
      expect(motionPresets.slideLeft.initial).toEqual({ opacity: 0, x: -24 })
    })

    it('should have slideRight preset with correct structure', () => {
      expect(motionPresets.slideRight).toBeDefined()
      expect(motionPresets.slideRight.initial).toEqual({ opacity: 0, x: 24 })
    })

    it('should have scaleIn preset with correct structure', () => {
      expect(motionPresets.scaleIn).toBeDefined()
      expect(motionPresets.scaleIn.initial).toEqual({ opacity: 0, scale: 0.9 })
    })

    it('should have popIn preset with bounce easing', () => {
      expect(motionPresets.popIn).toBeDefined()
      expect(motionPresets.popIn.enter?.transition?.ease).toEqual([0.68, -0.55, 0.265, 1.55])
    })

    it('should have cardHover preset for hover effects', () => {
      expect(motionPresets.cardHover).toBeDefined()
      expect(motionPresets.cardHover.hovered).toBeDefined()
      expect(motionPresets.cardHover.hovered?.y).toBe(-4)
    })

    it('should have buttonPress preset for tap effects', () => {
      expect(motionPresets.buttonPress).toBeDefined()
      expect(motionPresets.buttonPress.tapped).toBeDefined()
      expect(motionPresets.buttonPress.tapped?.scale).toBe(0.97)
    })

    it('should have listItem preset for list animations', () => {
      expect(motionPresets.listItem).toBeDefined()
      expect(motionPresets.listItem.initial).toEqual({ opacity: 0, x: -16 })
    })
  })

  describe('getStaggerDelay', () => {
    it('should calculate delay based on index', () => {
      expect(getStaggerDelay(0)).toBe(0)
      expect(getStaggerDelay(1)).toBe(50)
      expect(getStaggerDelay(2)).toBe(100)
      expect(getStaggerDelay(5)).toBe(250)
    })

    it('should use custom base delay', () => {
      expect(getStaggerDelay(2, 100)).toBe(200)
      expect(getStaggerDelay(3, 30)).toBe(90)
    })

    it('should cap delay at maxDelay', () => {
      expect(getStaggerDelay(100, 50, 500)).toBe(500)
      expect(getStaggerDelay(20, 50, 300)).toBe(300)
    })

    it('should not exceed maxDelay even with high index', () => {
      const result = getStaggerDelay(1000, 50, 500)
      expect(result).toBe(500)
    })
  })

  describe('createStaggerVariants', () => {
    it('should create variants with stagger delay', () => {
      const variants = createStaggerVariants(2)
      expect(variants.enter?.transition?.delay).toBe(100)
    })

    it('should use custom preset', () => {
      const variants = createStaggerVariants(1, 'fadeIn')
      expect(variants.initial).toEqual({ opacity: 0 })
      expect(variants.enter?.transition?.delay).toBe(50)
    })

    it('should use custom base delay', () => {
      const variants = createStaggerVariants(3, 'listItem', 100)
      expect(variants.enter?.transition?.delay).toBe(300)
    })

    it('should handle presets without enter property', () => {
      const variants = createStaggerVariants(1, 'buttonPress')
      // buttonPress doesn't have enter, should return the preset as-is
      expect(variants).toBeDefined()
    })
  })
})
