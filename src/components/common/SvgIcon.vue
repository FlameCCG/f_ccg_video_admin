<script setup lang="ts">
/**
 * SVG 图标渲染组件
 * 支持渲染 SVG 字符串
 */
import { computed } from 'vue'

interface Props {
  /** SVG 字符串 */
  svg?: string
  /** 图标大小 */
  size?: number | string
  /** 图标颜色（可选，默认继承） */
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  svg: '',
  size: 16,
  color: 'currentColor',
})

/**
 * 清理并安全过滤 SVG 字符串以防范 XSS
 */
function sanitizeSvg(svg: string): string {
  // 1. 移除 script 标签
  let clean = svg.replace(/<script\b[\s\S]*?<\/script>/gi, '')
  clean = clean.replace(/<script\b[^>]*\/>/gi, '')

  // 2. 移除 onload 等事件处理器以及 javascript: 伪协议
  clean = clean.replace(
    /(<[a-zA-Z0-9:-]+)([^>]*)(>)/g,
    (_match: string, tagStart: string, attrs: string, tagEnd: string) => {
      const sanitizedAttrs = attrs.replace(/\s*on[a-zA-Z]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '')
      const finalAttrs = sanitizedAttrs.replace(
        /\s*(href|xlink:href)\s*=\s*(['"]\s*javascript:[^'"]*['"]|[^\s>]*javascript:[^\s>]*)/gi,
        ''
      )
      return `${tagStart}${finalAttrs}${tagEnd}`
    }
  )

  return clean
}

/** 处理后的 SVG 字符串 */
const processedSvg = computed(() => {
  if (!props.svg) return ''

  let svg = props.svg.trim()

  // 如果不是以 <svg 开头，可能是不完整的 SVG
  if (!svg.startsWith('<svg')) {
    return ''
  }

  // 只移除 <svg> 标签上的 width/height 属性，使用 size 控制
  // 先提取 <svg ...> 开始标签，只在其中移除 width/height
  const svgTagMatch = svg.match(/^<svg[^>]*>/)
  if (svgTagMatch) {
    let svgTag = svgTagMatch[0]
    svgTag = svgTag.replace(/\s(width|height)="[^"]*"/g, '')
    svg = svgTag + svg.slice(svgTagMatch[0].length)
  }

  // 添加统一的样式属性
  const sizeValue = typeof props.size === 'number' ? `${props.size}px` : props.size
  const styleAttr = `style="width: ${sizeValue}; height: ${sizeValue}; display: inline-block; vertical-align: middle;"`

  // 检查是否是描边类型的 SVG（fill="none" 且有 stroke 属性）
  const isStrokeIcon = svg.includes('fill="none"') && svg.includes('stroke=')

  // 只有非描边类型的 SVG 才添加 fill 属性
  if (!isStrokeIcon && !svg.includes('fill=')) {
    svg = svg.replace('<svg', `<svg fill="${props.color}"`)
  }

  // 插入 style 属性
  svg = svg.replace('<svg', `<svg ${styleAttr}`)

  return sanitizeSvg(svg)
})

/** 是否有有效的 SVG */
const hasValidSvg = computed(() => !!processedSvg.value)
</script>

<template>
  <span v-if="hasValidSvg" class="svg-icon" v-html="processedSvg" />
  <span v-else class="svg-icon svg-icon--empty">-</span>
</template>

<style scoped lang="scss">
.svg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  &--empty {
    color: var(--color-text-muted);
  }

  :deep(svg) {
    display: block;
  }
}
</style>
