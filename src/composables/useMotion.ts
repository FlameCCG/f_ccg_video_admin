/**
 * Motion Composable
 * 微交互动效管理
 * Requirements: 20.1, 20.2, 20.3
 */
import { computed, type MaybeRef, unref } from 'vue'
import { useMediaQuery } from '@vueuse/core'

/**
 * 动效变体类型
 */
export interface MotionVariant {
  opacity?: number
  x?: number
  y?: number
  scale?: number
  boxShadow?: string
  transition?: {
    duration?: number
    delay?: number
    ease?: string | number[]
  }
}

export interface MotionVariants {
  initial?: MotionVariant
  enter?: MotionVariant
  hovered?: MotionVariant
  tapped?: MotionVariant
  leave?: MotionVariant
}

/**
 * 检测用户是否偏好减少动效
 */
export function useReducedMotion() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  return {
    prefersReducedMotion,
    /** 是否应该启用动效 */
    shouldAnimate: computed(() => !prefersReducedMotion.value),
  }
}

/**
 * 预设动效变体
 */
export const motionPresets = {
  /** 淡入 */
  fadeIn: {
    initial: { opacity: 0 },
    enter: {
      opacity: 1,
      transition: { duration: 200, ease: 'easeOut' },
    },
  } satisfies MotionVariants,

  /** 从下方滑入 */
  slideUp: {
    initial: { opacity: 0, y: 24 },
    enter: {
      opacity: 1,
      y: 0,
      transition: { duration: 250, ease: 'easeOut' },
    },
  } satisfies MotionVariants,

  /** 从上方滑入 */
  slideDown: {
    initial: { opacity: 0, y: -24 },
    enter: {
      opacity: 1,
      y: 0,
      transition: { duration: 250, ease: 'easeOut' },
    },
  } satisfies MotionVariants,

  /** 从左侧滑入 */
  slideLeft: {
    initial: { opacity: 0, x: -24 },
    enter: {
      opacity: 1,
      x: 0,
      transition: { duration: 250, ease: 'easeOut' },
    },
  } satisfies MotionVariants,

  /** 从右侧滑入 */
  slideRight: {
    initial: { opacity: 0, x: 24 },
    enter: {
      opacity: 1,
      x: 0,
      transition: { duration: 250, ease: 'easeOut' },
    },
  } satisfies MotionVariants,

  /** 缩放进入 */
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    enter: {
      opacity: 1,
      scale: 1,
      transition: { duration: 200, ease: 'easeOut' },
    },
  } satisfies MotionVariants,

  /** 弹性缩放 */
  popIn: {
    initial: { opacity: 0, scale: 0.8 },
    enter: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 300,
        ease: [0.68, -0.55, 0.265, 1.55], // bounce easing
      },
    },
  } satisfies MotionVariants,

  /** 卡片悬浮效果 */
  cardHover: {
    initial: { y: 0, boxShadow: 'var(--shadow-sm)' },
    hovered: {
      y: -4,
      boxShadow: 'var(--shadow-lg)',
      transition: { duration: 200, ease: 'easeOut' },
    },
  } satisfies MotionVariants,

  /** 按钮点击效果 */
  buttonPress: {
    initial: { scale: 1 },
    tapped: {
      scale: 0.97,
      transition: { duration: 100, ease: 'easeOut' },
    },
  } satisfies MotionVariants,

  /** 列表项交错进入 */
  listItem: {
    initial: { opacity: 0, x: -16 },
    enter: {
      opacity: 1,
      x: 0,
      transition: { duration: 200, ease: 'easeOut' },
    },
  } satisfies MotionVariants,
} as const

export type MotionPresetName = keyof typeof motionPresets

/**
 * 获取动效变体（支持 reduced motion）
 */
export function useMotionVariants(
  presetName: MaybeRef<MotionPresetName>,
  options?: {
    /** 自定义延迟 */
    delay?: number
    /** 自定义持续时间 */
    duration?: number
  }
) {
  const { prefersReducedMotion } = useReducedMotion()

  const variants = computed(() => {
    const name = unref(presetName)
    const preset = motionPresets[name]

    // 如果用户偏好减少动效，返回无动画变体
    if (prefersReducedMotion.value) {
      return {
        initial: {},
        enter: {},
        hovered: {},
        tapped: {},
      }
    }

    // 应用自定义选项
    if (options?.delay || options?.duration) {
      const customPreset = JSON.parse(JSON.stringify(preset)) as MotionVariants
      if (customPreset.enter) {
        const enterTransition = customPreset.enter.transition || {}
        if (options.delay) {
          enterTransition.delay = options.delay
        }
        if (options.duration) {
          enterTransition.duration = options.duration
        }
        customPreset.enter.transition = enterTransition
      }
      return customPreset
    }

    return preset
  })

  return variants
}

/**
 * 生成列表项交错动画的延迟
 */
export function getStaggerDelay(index: number, baseDelay = 50, maxDelay = 500): number {
  return Math.min(index * baseDelay, maxDelay)
}

/**
 * 创建交错动画变体
 */
export function createStaggerVariants(
  index: number,
  preset: MotionPresetName = 'listItem',
  baseDelay = 50
): MotionVariants {
  const basePreset = motionPresets[preset]
  const delay = getStaggerDelay(index, baseDelay)

  // 只处理有 enter 属性的预设
  if ('enter' in basePreset && basePreset.enter) {
    return {
      ...basePreset,
      enter: {
        ...basePreset.enter,
        transition: {
          ...basePreset.enter.transition,
          delay,
        },
      },
    }
  }

  // 对于没有 enter 的预设，直接返回
  return basePreset
}
