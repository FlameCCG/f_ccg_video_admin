<script setup lang="ts">
/**
 * 表格工具栏组件
 * 提供搜索、筛选、刷新、导出等操作
 * Requirements: 8.1, 9.1
 */
import { useI18n } from 'vue-i18n'
import { NSpace, NButton, NIcon, NTooltip } from 'naive-ui'

interface Props {
  /** 是否显示刷新按钮 */
  showRefresh?: boolean
  /** 是否显示导出按钮 */
  showExport?: boolean
  /** 是否显示列设置按钮 */
  showColumnSetting?: boolean
  /** 是否显示密度设置按钮 */
  showDensity?: boolean
  /** 刷新按钮加载状态 */
  refreshLoading?: boolean
  /** 导出按钮加载状态 */
  exportLoading?: boolean
}

withDefaults(defineProps<Props>(), {
  showRefresh: true,
  showExport: false,
  showColumnSetting: false,
  showDensity: false,
  refreshLoading: false,
  exportLoading: false,
})

const emit = defineEmits<{
  refresh: []
  export: []
  columnSetting: []
  densityChange: [density: 'small' | 'medium' | 'large']
}>()

const { t } = useI18n()

function handleRefresh(): void {
  emit('refresh')
}

function handleExport(): void {
  emit('export')
}

function handleColumnSetting(): void {
  emit('columnSetting')
}
</script>

<template>
  <div class="table-toolbar">
    <!-- 左侧插槽（搜索、筛选等） -->
    <div class="table-toolbar__left">
      <slot name="left" />
    </div>

    <!-- 右侧操作按钮 -->
    <div class="table-toolbar__right">
      <n-space :size="8">
        <!-- 自定义操作插槽 -->
        <slot name="actions" />

        <!-- 刷新按钮 -->
        <n-tooltip v-if="showRefresh" trigger="hover">
          <template #trigger>
            <n-button quaternary circle :loading="refreshLoading" @click="handleRefresh">
              <template #icon>
                <n-icon>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path
                      d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
                    />
                  </svg>
                </n-icon>
              </template>
            </n-button>
          </template>
          {{ t('common.refresh') }}
        </n-tooltip>

        <!-- 导出按钮 -->
        <n-tooltip v-if="showExport" trigger="hover">
          <template #trigger>
            <n-button quaternary circle :loading="exportLoading" @click="handleExport">
              <template #icon>
                <n-icon>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </n-icon>
              </template>
            </n-button>
          </template>
          {{ t('common.export') }}
        </n-tooltip>

        <!-- 列设置按钮 -->
        <n-tooltip v-if="showColumnSetting" trigger="hover">
          <template #trigger>
            <n-button quaternary circle @click="handleColumnSetting">
              <template #icon>
                <n-icon>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path
                      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                    />
                  </svg>
                </n-icon>
              </template>
            </n-button>
          </template>
          列设置
        </n-tooltip>
      </n-space>
    </div>
  </div>
</template>

<style scoped lang="scss">
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding: var(--spacing-3) 0;

  &__left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  &__right {
    flex-shrink: 0;
  }
}
</style>
