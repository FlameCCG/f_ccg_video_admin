<script setup lang="ts">
/**
 * 侧边栏组件
 * 包含 Logo 和菜单，带精致的折叠动画
 * Requirements: 6.1, 6.4
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NTooltip } from 'naive-ui'
import { useAppStore } from '@/stores/app'
import AppLogo from './AppLogo.vue'
import AppMenu from './AppMenu.vue'

const { t } = useI18n()
const appStore = useAppStore()

const collapsed = computed(() => appStore.sidebarCollapsed)
const isHovering = ref(false)

/** 切换侧边栏折叠状态 */
function handleToggle(): void {
  appStore.toggleSidebar()
}
</script>

<template>
  <div class="app-sidebar" :class="{ 'is-collapsed': collapsed }">
    <!-- Logo 区域 -->
    <div class="sidebar-logo">
      <AppLogo :collapsed="collapsed" />
    </div>

    <!-- 菜单区域 -->
    <div class="sidebar-menu">
      <AppMenu :collapsed="collapsed" />
    </div>

    <!-- 折叠按钮 -->
    <div class="sidebar-footer">
      <NTooltip placement="right" :disabled="!collapsed">
        <template #trigger>
          <button
            class="collapse-btn"
            :class="{ 'is-collapsed': collapsed, 'is-hovering': isHovering }"
            :aria-label="collapsed ? t('layout.sidebar.expand') : t('layout.sidebar.collapse')"
            @click="handleToggle"
            @mouseenter="isHovering = true"
            @mouseleave="isHovering = false"
          >
            <span class="collapse-btn-inner">
              <span class="collapse-icon-wrapper">
                <svg
                  class="collapse-icon"
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
                  <path d="M11 17l-5-5 5-5" />
                  <path d="M18 17l-5-5 5-5" />
                </svg>
              </span>
              <span class="collapse-text">
                <transition name="text-fade" mode="out-in">
                  <span v-if="!collapsed" key="collapse">
                    {{ t('layout.sidebar.collapse') }}
                  </span>
                </transition>
              </span>
            </span>
            <span class="collapse-btn-bg" />
          </button>
        </template>
        {{ t('layout.sidebar.expand') }}
      </NTooltip>
    </div>

    <!-- 侧边栏底部装饰 -->
    <div class="sidebar-glow" />
  </div>
</template>

<style scoped lang="scss">
.app-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.sidebar-logo {
  flex-shrink: 0;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  position: relative;
  transition: padding 280ms cubic-bezier(0.4, 0, 0.2, 1);

  // 底部分隔线 - 渐变效果
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--color-border-light) 20%,
      var(--color-border-light) 80%,
      transparent 100%
    );
    transition:
      left 280ms cubic-bezier(0.4, 0, 0.2, 1),
      right 280ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .is-collapsed & {
    padding: 0 12px;

    &::after {
      left: 12px;
      right: 12px;
    }
  }
}

.sidebar-menu {
  flex: 1;
  overflow: hidden auto;
  padding: 12px 8px;
  transition: padding 280ms cubic-bezier(0.4, 0, 0.2, 1);

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
    opacity: 0;
    transition: opacity 200ms;
  }

  &:hover::-webkit-scrollbar-thumb {
    opacity: 1;
  }

  .is-collapsed & {
    padding: 12px 4px;
  }
}

.sidebar-footer {
  flex-shrink: 0;
  padding: 12px;
  position: relative;
  transition: padding 280ms cubic-bezier(0.4, 0, 0.2, 1);

  // 顶部分隔线 - 渐变效果
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--color-border-light) 20%,
      var(--color-border-light) 80%,
      transparent 100%
    );
    transition:
      left 280ms cubic-bezier(0.4, 0, 0.2, 1),
      right 280ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .is-collapsed & {
    padding: 12px 8px;

    &::before {
      left: 12px;
      right: 12px;
    }
  }
}

.collapse-btn {
  position: relative;
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition:
    padding 280ms cubic-bezier(0.4, 0, 0.2, 1),
    justify-content 280ms cubic-bezier(0.4, 0, 0.2, 1);

  &.is-collapsed {
    justify-content: center;
    padding: 0;
  }
}

.collapse-btn-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-secondary);
  transition: color 200ms cubic-bezier(0.4, 0, 0.2, 1);

  .collapse-btn:hover & {
    color: var(--color-primary);
  }
}

.collapse-btn-bg {
  position: absolute;
  inset: 0;
  background: var(--color-primary);
  opacity: 0;
  transform: scale(0.95);
  border-radius: var(--radius-lg);
  transition:
    opacity 200ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 200ms cubic-bezier(0.4, 0, 0.2, 1);

  .collapse-btn:hover & {
    opacity: 0.08;
    transform: scale(1);
  }

  .collapse-btn:active & {
    opacity: 0.12;
    transform: scale(0.98);
  }
}

.collapse-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  transition:
    background 200ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 280ms cubic-bezier(0.4, 0, 0.2, 1);

  .collapse-btn:hover & {
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  }

  .is-collapsed & {
    transform: rotate(180deg);
  }
}

.collapse-icon {
  flex-shrink: 0;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);

  .collapse-btn:hover & {
    transform: translateX(-2px);
  }

  .is-collapsed .collapse-btn:hover & {
    transform: translateX(2px);
  }
}

.collapse-text {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
}

// 文字淡入淡出
.text-fade-enter-active,
.text-fade-leave-active {
  transition:
    opacity 150ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.text-fade-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}

.text-fade-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

// 底部光晕装饰
.sidebar-glow {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 120px;
  background: radial-gradient(
    ellipse at center bottom,
    color-mix(in srgb, var(--color-primary) 6%, transparent) 0%,
    transparent 70%
  );
  pointer-events: none;
  opacity: 0.8;
  transition: opacity 280ms cubic-bezier(0.4, 0, 0.2, 1);

  .is-collapsed & {
    opacity: 0.4;
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .collapse-btn,
  .collapse-btn-inner,
  .collapse-btn-bg,
  .collapse-icon-wrapper,
  .collapse-icon,
  .sidebar-logo,
  .sidebar-menu,
  .sidebar-footer,
  .sidebar-glow {
    transition: none;
  }

  .text-fade-enter-active,
  .text-fade-leave-active {
    transition: none;
  }
}
</style>
