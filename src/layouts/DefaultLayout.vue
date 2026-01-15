<script setup lang="ts">
/**
 * 默认布局
 * 包含侧边栏、标签栏和顶栏的主布局
 * Requirements: 6.1
 */
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NLayout, NLayoutSider } from 'naive-ui'
import { useAppStore } from '@/stores/app'
import { useTabsStore } from '@/stores/tabs'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppTabBar from '@/components/layout/AppTabBar.vue'

const route = useRoute()
const appStore = useAppStore()
const tabsStore = useTabsStore()

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)

/** 侧边栏宽度 */
const SIDEBAR_WIDTH = 260
const SIDEBAR_COLLAPSED_WIDTH = 72

/** 监听路由变化，自动添加标签 */
watch(
  () => route.path,
  () => {
    if (route.path && route.meta) {
      tabsStore.addTab(route)
    }
  },
  { immediate: true }
)
</script>

<template>
  <NLayout class="default-layout" has-sider>
    <!-- 侧边栏 - 固定不滚动 -->
    <NLayoutSider
      collapse-mode="width"
      :collapsed="sidebarCollapsed"
      :collapsed-width="SIDEBAR_COLLAPSED_WIDTH"
      :width="SIDEBAR_WIDTH"
      :native-scrollbar="false"
      class="layout-sider"
      :class="{ 'is-collapsed': sidebarCollapsed }"
    >
      <AppSidebar />
    </NLayoutSider>

    <!-- 主内容区 -->
    <div class="layout-main">
      <!-- 顶栏 - 固定在顶部，不滚动 -->
      <header class="layout-header">
        <AppHeader />
      </header>

      <!-- 标签栏 - 横向可滑动，在 header 下方 -->
      <AppTabBar class="layout-tabs" />

      <!-- 内容区 - 只有这里滚动 -->
      <main class="layout-content">
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </NLayout>
</template>

<style scoped lang="scss">
.default-layout {
  height: 100vh;
  background-color: var(--color-bg);
}

.layout-sider {
  position: sticky;
  top: 0;
  height: 100vh;
  background: linear-gradient(
    180deg,
    var(--color-surface) 0%,
    color-mix(in srgb, var(--color-surface) 97%, var(--color-primary) 3%) 100%
  );
  border-right: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-elev-1);
  transition:
    width 280ms cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width;
  z-index: 100;
  flex-shrink: 0;

  &.is-collapsed {
    box-shadow: none;
  }

  // 侧边栏右侧装饰线
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(180deg, transparent 0%, var(--color-primary) 50%, transparent 100%);
    opacity: 0.15;
    transition: opacity 280ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  &.is-collapsed::after {
    opacity: 0;
  }
}

.layout-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100vh;
  min-width: 0;
  overflow: hidden;
}

.layout-header {
  flex-shrink: 0;
  height: 56px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
  z-index: 10;
}

.layout-content {
  flex: 1;
  min-height: 0;
  overflow: hidden auto;
  background-color: var(--color-bg);

  // 滚动条样式
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border-strong);
    border-radius: 3px;

    &:hover {
      background: var(--color-text-muted);
    }
  }

  // Firefox
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-strong) transparent;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  height: 100%;
  min-height: 0;
}

// 页面切换动画
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 响应式适配 */
@media (prefers-reduced-motion: reduce) {
  .layout-sider {
    transition: none;
  }

  .fade-slide-enter-active,
  .fade-slide-leave-active {
    transition: none;
  }
}
</style>
