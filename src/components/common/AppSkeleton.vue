<script setup lang="ts">
/**
 * 骨架屏组件
 * 用于内容加载时的占位展示
 * Requirements: 20.4, 20.5
 */
import { computed } from 'vue'
import { NSkeleton } from 'naive-ui'

type SkeletonType = 'text' | 'avatar' | 'image' | 'card' | 'list' | 'table'

interface Props {
  /** 骨架屏类型 */
  type?: SkeletonType
  /** 是否激活动画 */
  animated?: boolean
  /** 文本行数（type=text 时有效） */
  rows?: number
  /** 列表项数（type=list 时有效） */
  count?: number
  /** 宽度 */
  width?: string | number
  /** 高度 */
  height?: string | number
  /** 是否圆形（type=avatar 时有效） */
  round?: boolean
  /** 是否显示 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  animated: true,
  rows: 3,
  count: 3,
  width: undefined,
  height: undefined,
  round: true,
  loading: true,
})

/** 宽度样式 */
const widthStyle = computed(() => {
  if (!props.width) return undefined
  return typeof props.width === 'number' ? `${props.width}px` : props.width
})

/** 高度样式 */
const heightStyle = computed(() => {
  if (!props.height) return undefined
  return typeof props.height === 'number' ? `${props.height}px` : props.height
})

/** 列表项数组 */
const listItems = computed(() => Array.from({ length: props.count }, (_, i) => i))
</script>

<template>
  <template v-if="loading">
    <!-- 文本骨架 -->
    <div v-if="type === 'text'" class="app-skeleton app-skeleton--text">
      <n-skeleton
        v-for="i in rows"
        :key="i"
        :animated="animated"
        :width="i === rows ? '60%' : '100%'"
        :height="heightStyle || '16px'"
        text
      />
    </div>

    <!-- 头像骨架 -->
    <div v-else-if="type === 'avatar'" class="app-skeleton app-skeleton--avatar">
      <n-skeleton
        :animated="animated"
        :width="widthStyle || '40px'"
        :height="heightStyle || '40px'"
        :circle="round"
      />
    </div>

    <!-- 图片骨架 -->
    <div v-else-if="type === 'image'" class="app-skeleton app-skeleton--image">
      <n-skeleton
        :animated="animated"
        :width="widthStyle || '100%'"
        :height="heightStyle || '200px'"
      />
    </div>

    <!-- 卡片骨架 -->
    <div v-else-if="type === 'card'" class="app-skeleton app-skeleton--card">
      <n-skeleton :animated="animated" width="100%" height="160px" />
      <div class="app-skeleton__card-content">
        <n-skeleton :animated="animated" width="60%" height="20px" text />
        <n-skeleton :animated="animated" width="100%" height="14px" text />
        <n-skeleton :animated="animated" width="80%" height="14px" text />
      </div>
    </div>

    <!-- 列表骨架 -->
    <div v-else-if="type === 'list'" class="app-skeleton app-skeleton--list">
      <div v-for="i in listItems" :key="i" class="app-skeleton__list-item">
        <n-skeleton :animated="animated" width="40px" height="40px" circle />
        <div class="app-skeleton__list-content">
          <n-skeleton :animated="animated" width="30%" height="16px" text />
          <n-skeleton :animated="animated" width="80%" height="14px" text />
        </div>
      </div>
    </div>

    <!-- 表格骨架 -->
    <div v-else-if="type === 'table'" class="app-skeleton app-skeleton--table">
      <!-- 表头 -->
      <div class="app-skeleton__table-header">
        <n-skeleton v-for="i in 5" :key="i" :animated="animated" width="100%" height="20px" text />
      </div>
      <!-- 表格行 -->
      <div v-for="row in count" :key="row" class="app-skeleton__table-row">
        <n-skeleton
          v-for="col in 5"
          :key="col"
          :animated="animated"
          width="100%"
          height="16px"
          text
        />
      </div>
    </div>
  </template>

  <slot v-else />
</template>

<style scoped lang="scss">
.app-skeleton {
  &--text {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  &--avatar {
    display: inline-flex;
  }

  &--image {
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  &--card {
    border-radius: var(--radius-card);
    overflow: hidden;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  &__card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-4);
  }

  &--list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  &__list-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  &__list-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  &--table {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  &__table-header {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    background-color: var(--color-surface-alt);
    border-radius: var(--radius-md);
  }

  &__table-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--color-border-light);
  }
}
</style>
