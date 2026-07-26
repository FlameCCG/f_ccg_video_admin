/**
 * Reduced Motion Composable
 * 检测用户是否偏好减少动效（prefers-reduced-motion）
 *
 * 【使用场景】
 * CSS 层面的动效请直接用 `@media (prefers-reduced-motion: reduce)` 兜住；
 * 本 composable 只用于 CSS 无法覆盖的 JS 驱动动效，例如 Naive UI 的
 * `NNumberAnimation`（数字滚动）需要在运行时决定是否播放。
 */
import { computed, type ComputedRef } from 'vue'
import { useMediaQuery } from '@vueuse/core'

export interface UseReducedMotionReturn {
  /** 用户是否偏好减少动效 */
  prefersReducedMotion: ComputedRef<boolean>
  /** 是否应该启用动效（prefersReducedMotion 取反） */
  shouldAnimate: ComputedRef<boolean>
}

/**
 * 检测用户是否偏好减少动效
 */
export function useReducedMotion(): UseReducedMotionReturn {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  return {
    prefersReducedMotion,
    shouldAnimate: computed(() => !prefersReducedMotion.value),
  }
}
