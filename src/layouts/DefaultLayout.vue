<script setup lang="ts">
/**
 * 默认布局
 * 包含侧边栏和顶栏的主布局
 * Requirements: 6.1
 */
import { computed } from 'vue'
import { NLayout, NLayoutSider, NLayoutHeader, NLayoutContent } from 'naive-ui'
import { useAppStore } from '@/stores/app'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'

const appStore = useAppStore()

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)

/** 侧边栏宽度 */
const SIDEBAR_WIDTH = 260
const SIDEBAR_COLLAPSED_WIDTH = 72
</script>

<template>
  <NLayout class="default-layout" has-sider>
    <!-- 侧边栏 -->
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
    <NLayout class="layout-main">
      <!-- 顶栏 -->
      <NLayoutHeader bordered class="layout-header">
        <AppHeader />
      </NLayoutHeader>

      <!-- 内容区 -->
      <NLayoutContent class="layout-content" :native-scrollbar="false">
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<style scoped lang="scss">
.default-layout {
  min-height: 100vh;
  background-color: var(--color-bg);
}

.layout-sider {
  position: relative;
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
  min-height: 100vh;
  transition: margin-left 280ms cubic-bezier(0.4, 0, 0.2, 1);
}

.layout-header {
  height: 56px;
  padding: 0;
  background-color: var(--color-surface);
}

.layout-content {
  flex: 1;
  background-color: var(--color-bg);
}

.content-wrapper {
  padding: 16px 24px;
  min-height: calc(100vh - 56px);
}

/* 页面过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity var(--duration-normal) var(--easing-standard),
    transform var(--duration-normal) var(--easing-standard);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
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

  .fade-slide-enter-from,
  .fade-slide-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
