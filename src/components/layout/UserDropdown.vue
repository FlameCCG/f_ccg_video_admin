<script setup lang="ts">
/**
 * 用户下拉菜单组件
 * 显示头像、用户名、角色切换、退出登录
 * Requirements: 6.2
 */
import { computed, ref, h } from 'vue'
import { useRouter } from 'vue-router'
import { NDropdown, NAvatar, NButton, useDialog, useMessage, type DropdownOption } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const dialog = useDialog()
const message = useMessage()
const authStore = useAuthStore()

/** 临时用户信息（后续会从 user store 获取） */
const userInfo = ref({
  username: 'Admin',
  avatar: '',
  roleNames: ['超级管理员'],
})

/** 用户头像显示 */
const avatarText = computed(() => {
  return userInfo.value.username.charAt(0).toUpperCase()
})

/** 当前角色 */
const currentRole = computed(() => {
  return userInfo.value.roleNames[0] || ''
})

/** 图标 SVG 映射 */
const iconSvgs: Record<string, string> = {
  profile: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  logout: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
}

/** 渲染图标 */
function renderIcon(type: string) {
  const svg = iconSvgs[type]
  if (!svg) return undefined
  return () => h('span', { innerHTML: svg, style: 'display: flex; align-items: center;' })
}

/** 下拉菜单选项 */
const dropdownOptions = computed<DropdownOption[]>(() => [
  {
    key: 'profile',
    label: t('layout.header.profile'),
    icon: renderIcon('profile'),
  },
  {
    key: 'settings',
    label: t('layout.header.settings'),
    icon: renderIcon('settings'),
  },
  {
    type: 'divider',
    key: 'd1',
  },
  {
    key: 'logout',
    label: t('layout.header.logout'),
    icon: renderIcon('logout'),
  },
])

/** 处理下拉菜单选择 */
function handleSelect(key: string): void {
  switch (key) {
    case 'profile':
      void router.push('/profile')
      break
    case 'settings':
      void router.push('/settings')
      break
    case 'logout':
      handleLogout()
      break
  }
}

/** 退出登录 */
function handleLogout(): void {
  dialog.warning({
    title: t('common.dialog.confirmTitle'),
    content: t('auth.logout.confirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      authStore.logout()
      message.success(t('auth.logout.success'))
      void router.push('/login')
    },
  })
}
</script>

<template>
  <NDropdown
    trigger="click"
    :options="dropdownOptions"
    placement="bottom-end"
    @select="handleSelect"
  >
    <NButton quaternary class="user-trigger">
      <div class="user-info">
        <NAvatar
          v-if="userInfo.avatar"
          :src="userInfo.avatar"
          :size="32"
          round
          class="user-avatar"
        />
        <NAvatar v-else :size="32" round class="user-avatar">
          {{ avatarText }}
        </NAvatar>
        <div class="user-detail">
          <span class="user-name">{{ userInfo.username }}</span>
          <span class="user-role">{{ currentRole }}</span>
        </div>
        <svg
          class="dropdown-arrow"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </NButton>
  </NDropdown>
</template>

<style scoped lang="scss">
.user-trigger {
  padding: 4px 8px;
  height: auto;

  &:hover {
    background-color: var(--color-surface-hover);
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  color: white;
  font-weight: 500;
}

.user-detail {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.2;
}

.user-role {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.2;
}

.dropdown-arrow {
  color: var(--color-text-muted);
  margin-left: 4px;
}
</style>
