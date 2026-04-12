import { onBeforeUnmount } from 'vue'

const AUTO_SCROLL_EDGE_SIZE = 72
const MAX_AUTO_SCROLL_SPEED = 20

interface VerticalBounds {
  top: number
  bottom: number
}

/** 根据指针距离滚动区域上下边缘的位置计算每帧滚动距离。 */
export function calculateDragScrollDelta(pointerY: number, bounds: VerticalBounds): number {
  const height = Math.max(0, bounds.bottom - bounds.top)
  const edgeSize = Math.min(AUTO_SCROLL_EDGE_SIZE, height / 2)
  if (edgeSize <= 0) return 0

  const topDistance = pointerY - bounds.top
  if (topDistance < edgeSize) {
    const intensity = Math.min(1, Math.max(0, (edgeSize - topDistance) / edgeSize))
    return -MAX_AUTO_SCROLL_SPEED * intensity
  }

  const bottomDistance = bounds.bottom - pointerY
  if (bottomDistance < edgeSize) {
    const intensity = Math.min(1, Math.max(0, (edgeSize - bottomDistance) / edgeSize))
    return MAX_AUTO_SCROLL_SPEED * intensity
  }

  return 0
}

function findScrollableAncestor(start: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = start

  while (current) {
    const overflowY = window.getComputedStyle(current).overflowY
    const canScroll = /(auto|scroll|overlay)/.test(overflowY)
    const isNaiveScrollbarContainer = current.classList.contains('n-scrollbar-container')
    if ((canScroll || isNaiveScrollbarContainer) && current.scrollHeight > current.clientHeight) {
      return current
    }
    current = current.parentElement
  }

  return null
}

/**
 * 原生拖拽靠近滚动容器边缘时自动滚动。
 * update 仅更新指针和目标容器，实际滚动由单一 requestAnimationFrame 循环完成。
 */
export function useDragAutoScroll(): {
  update: (eventTarget: EventTarget | null, pointerY: number) => void
  stop: () => void
} {
  let scrollContainer: HTMLElement | null = null
  let pointerY = 0
  let animationFrameId: number | null = null

  function stop(): void {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId)
    }
    animationFrameId = null
    scrollContainer = null
  }

  function scrollFrame(): void {
    animationFrameId = null
    if (!scrollContainer) return

    const bounds = scrollContainer.getBoundingClientRect()
    const delta = calculateDragScrollDelta(pointerY, bounds)
    if (delta === 0) return

    const previousScrollTop = scrollContainer.scrollTop
    scrollContainer.scrollTop += delta

    if (scrollContainer.scrollTop !== previousScrollTop) {
      animationFrameId = window.requestAnimationFrame(scrollFrame)
    }
  }

  function update(eventTarget: EventTarget | null, nextPointerY: number): void {
    if (!(eventTarget instanceof HTMLElement)) return

    const nextContainer = findScrollableAncestor(eventTarget)
    if (!nextContainer) {
      stop()
      return
    }

    scrollContainer = nextContainer
    pointerY = nextPointerY
    if (animationFrameId === null) {
      animationFrameId = window.requestAnimationFrame(scrollFrame)
    }
  }

  onBeforeUnmount(stop)

  return { update, stop }
}
