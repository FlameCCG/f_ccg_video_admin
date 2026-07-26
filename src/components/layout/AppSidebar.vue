<script setup lang="ts">
/**
 * 侧边栏组件
 * 包含 Logo 和菜单，带精致的折叠动画
 * Requirements: 6.1, 6.4
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NTooltip } from 'naive-ui'
import { useAppStore } from '@/stores/app'
import AppLogo from './AppLogo.vue'
import AppMenu from './AppMenu.vue'

defineProps<{
  /**
   * 折叠态宽度（px）
   * 由 DefaultLayout 从 --layout-sider-collapsed-width 读出后透传：
   * NMenu 折叠态要用同一个数字才能把图标摆在侧边栏中线上。
   */
  collapsedWidth: number
}>()

const { t } = useI18n()
const appStore = useAppStore()

const collapsed = computed(() => appStore.sidebarCollapsed)

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

    <!-- 菜单区域 - 独立滚动容器 -->
    <div class="sidebar-menu">
      <div class="sidebar-menu__scroll">
        <AppMenu :collapsed="collapsed" :collapsed-width="collapsedWidth" />
      </div>
    </div>

    <!-- 折叠按钮 -->
    <div class="sidebar-footer">
      <NTooltip placement="right" :disabled="!collapsed">
        <template #trigger>
          <button
            class="collapse-btn"
            :class="{ 'is-collapsed': collapsed }"
            :aria-label="collapsed ? t('layout.sidebar.expand') : t('layout.sidebar.collapse')"
            @click="handleToggle"
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
@use '@/styles/transitions/interaction' as ix;

.app-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-logo {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;

  // 必须与顶栏同高：logo 区底部的 hairline 要和 header 的下边框连成一条线。
  // 此前写死 64px 而 header 是 56px，每个页面左上角都能看到 8px 的错位台阶。
  height: var(--layout-header-height);
  padding: 0 var(--spacing-5);

  &::after {
    position: absolute;
    inset: auto var(--spacing-5) 0;
    height: 1px;
    content: '';
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--color-border-subtle) 20%,
      var(--color-border-subtle) 80%,
      transparent 100%
    );
  }

  // 折叠态只切换内边距，不做补间：侧边栏宽度动画已经把状态变化说清楚了，
  // 每个子块再各自补一条 padding / left / right 过渡，只会在动画期间多出几轮布局计算。
  .is-collapsed & {
    padding: 0 var(--spacing-3);

    &::after {
      inset: auto var(--spacing-3) 0;
    }
  }
}

.sidebar-menu {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  &__scroll {
    height: 100%;
    padding: var(--spacing-3) var(--spacing-2);
    overflow: hidden auto;
    scrollbar-width: thin;
    scrollbar-color: var(--color-scrollbar-thumb) transparent;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
      margin: var(--spacing-2) 0;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--color-scrollbar-thumb);
      border-radius: var(--radius-full);

      &:hover {
        background: var(--color-scrollbar-thumb-hover);
      }
    }

    // 折叠态去掉横向内边距，让菜单可用宽度正好等于侧边栏折叠宽度 ——
    // NMenu 折叠态是按 collapsedWidth 反算 padding-left 来居中图标的，
    // 容器窄一点图标就整体偏左（此前这条规则写成 `.is-collapsed & &__scroll`，
    // 编译出来要求两层嵌套的 .sidebar-menu，从未匹配到任何元素）。
    .is-collapsed & {
      padding-inline: 0;
    }
  }
}

.sidebar-footer {
  position: relative;
  flex-shrink: 0;
  padding: var(--spacing-3);

  &::before {
    position: absolute;
    inset: 0 var(--spacing-5) auto;
    height: 1px;
    content: '';
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--color-border-subtle) 20%,
      var(--color-border-subtle) 80%,
      transparent 100%
    );
  }

  .is-collapsed & {
    padding: var(--spacing-3) var(--spacing-2);

    &::before {
      inset: 0 var(--spacing-3) auto;
    }
  }
}

.collapse-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;

  // 44px：与菜单项同一量级的按压区域（菜单项高度由 Naive 的 Menu.itemHeight 决定）
  height: calc(var(--spacing-10) + var(--spacing-1));
  padding: 0 var(--spacing-3);
  overflow: hidden;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-lg);

  @include ix.feedback-transition;
  @include ix.focus-ring;

  // $lift 传 0：按钮贴着侧边栏底部的分隔线，上抬会顶到线上
  @include ix.pressable(0.98, 0);

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
  gap: var(--spacing-2);
  color: var(--color-text-secondary);

  @include ix.feedback-transition;

  .collapse-btn:hover & {
    color: var(--color-primary);
  }
}

.collapse-btn-bg {
  position: absolute;
  inset: 0;
  background: var(--color-primary);
  border-radius: var(--radius-lg);
  opacity: 0;
  transform: scale(0.95);

  @include ix.feedback-transition;

  .collapse-btn:hover & {
    opacity: 0.08;
    transform: scale(1);
  }
}

.collapse-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--spacing-8);
  height: var(--spacing-8);
  background: var(--color-primary-subtle);
  border-radius: var(--radius-md);

  // 背景走 hover 语义；箭头翻转是折叠动作的一部分，时长与曲线跟侧边栏宽度动画对齐，
  // 否则 100ms 就转完、宽度还在走，两个动作会散开。
  transition:
    background-color ix.$hover-motion,
    transform var(--duration-slow) var(--easing-ease-in-out);

  .collapse-btn:hover & {
    background: var(--color-primary-subtle-hover);
  }

  .is-collapsed & {
    transform: rotate(180deg);
  }
}

.collapse-icon {
  flex-shrink: 0;

  @include ix.feedback-transition;

  .collapse-btn:hover & {
    transform: translateX(-2px);
  }

  .is-collapsed .collapse-btn:hover & {
    transform: translateX(2px);
  }
}

.collapse-text {
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  white-space: nowrap;
}

@include ix.enter-leave(
  'text-fade',
  translateX(calc(-1 * var(--spacing-2))),
  translateX(var(--spacing-2))
);

.sidebar-glow {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 80%;
  height: var(--spacing-24);
  background: radial-gradient(
    ellipse at center bottom,
    color-mix(in srgb, var(--color-primary) 6%, transparent) 0%,
    transparent 70%
  );
  opacity: 0.8;
  transform: translateX(-50%);
  pointer-events: none;

  .is-collapsed & {
    opacity: 0.4;
  }
}
</style>
