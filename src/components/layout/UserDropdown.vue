<script setup lang="ts">
/**
 * 用户下拉菜单组件
 * 显示头像、用户名、角色切换、退出登录
 * Requirements: 6.2
 */
import { computed, ref, h } from 'vue'
import {
  NDropdown,
  NAvatar,
  NButton,
  NModal,
  NRadioGroup,
  NRadio,
  NSpace,
  useDialog,
  useMessage,
  type DropdownOption,
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { resetRouter, addDynamicRoutes } from '@/router/guard'
import router from '@/router'

const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()
const authStore = useAuthStore()
const userStore = useUserStore()
const permissionStore = usePermissionStore()

/** 切换角色弹窗 */
const showRoleSwitchModal = ref(false)
const selectedRoleId = ref<number>(0)
const isSwitchingRole = ref(false)

/** 用户头像显示 */
const avatarText = computed(() => {
  return userStore.username.charAt(0).toUpperCase() || 'U'
})

/** 当前角色名 */
const currentRoleName = computed(() => {
  const roleId = userStore.currentRoleId
  return userStore.roleMap[roleId] || userStore.roleNames[0] || ''
})

/** 图标 SVG 映射 */
const iconSvgs: Record<string, string> = {
  users: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  permission: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  switchRole: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  logout: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
}

/** 渲染图标 */
function renderIcon(type: string) {
  const svg = iconSvgs[type]
  if (!svg) return undefined
  return () => h('span', { innerHTML: svg, style: 'display: flex; align-items: center;' })
}

/** 下拉菜单选项 */
const dropdownOptions = computed<DropdownOption[]>(() => {
  const options: DropdownOption[] = [
    {
      key: 'users',
      label: t('layout.header.userManagement'),
      icon: renderIcon('users'),
    },
    {
      key: 'settings',
      label: t('layout.header.settings'),
      icon: renderIcon('settings'),
    },
    {
      key: 'permission',
      label: t('layout.header.permission'),
      icon: renderIcon('permission'),
    },
  ]

  // 如果有多个角色，显示切换角色选项
  if (userStore.hasMultipleRoles) {
    options.push({
      key: 'switchRole',
      label: t('layout.header.switchRole'),
      icon: renderIcon('switchRole'),
    })
  }

  options.push(
    {
      type: 'divider',
      key: 'd1',
    },
    {
      key: 'logout',
      label: t('layout.header.logout'),
      icon: renderIcon('logout'),
    }
  )

  return options
})

/** 处理下拉菜单选择 */
function handleSelect(key: string): void {
  switch (key) {
    case 'users':
      void router.push('/users/list')
      break
    case 'settings':
      void router.push('/system-config/site')
      break
    case 'permission':
      void router.push('/system/roles')
      break
    case 'switchRole':
      openRoleSwitchModal()
      break
    case 'logout':
      handleLogout()
      break
  }
}

/** 打开切换角色弹窗 */
function openRoleSwitchModal(): void {
  selectedRoleId.value = userStore.currentRoleId
  showRoleSwitchModal.value = true
}

/** 确认切换角色 */
async function handleConfirmSwitchRole(): Promise<void> {
  if (selectedRoleId.value === userStore.currentRoleId) {
    showRoleSwitchModal.value = false
    return
  }

  isSwitchingRole.value = true
  try {
    await userStore.switchUserRole({ roleId: selectedRoleId.value })
    message.success(t('layout.header.switchRoleSuccess'))
    showRoleSwitchModal.value = false

    // 切换角色后需要重新加载权限和菜单（无刷新）
    // 1. 先移除旧的动态路由
    resetRouter(router)

    // 2. 重新获取权限数据
    await permissionStore.fetchUserPermissions(userStore.userId)

    // 3. 手动添加新的动态路由
    addDynamicRoutes(router)

    // 4. 导航到首页
    await router.replace('/')
  } catch (error) {
    if (error instanceof Error) {
      message.error(error.message)
    }
  } finally {
    isSwitchingRole.value = false
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
      userStore.resetUser()
      permissionStore.resetPermission()
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
          v-if="userStore.avatar"
          :src="userStore.avatar"
          :size="32"
          round
          class="user-avatar"
        />
        <NAvatar v-else :size="32" round class="user-avatar">
          {{ avatarText }}
        </NAvatar>
        <div class="user-detail">
          <span class="user-name">{{ userStore.username || 'User' }}</span>
          <span class="user-role">{{ currentRoleName }}</span>
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

  <!-- 切换角色弹窗 -->
  <NModal
    v-model:show="showRoleSwitchModal"
    preset="dialog"
    :title="t('layout.header.switchRole')"
    :positive-text="t('common.confirm')"
    :negative-text="t('common.cancel')"
    :loading="isSwitchingRole"
    @positive-click="handleConfirmSwitchRole"
  >
    <NRadioGroup v-model:value="selectedRoleId" class="role-radio-group">
      <NSpace vertical>
        <NRadio
          v-for="role in userStore.roleList"
          :key="role.id"
          :value="role.id"
          :label="role.name"
        />
      </NSpace>
    </NRadioGroup>
  </NModal>
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

.role-radio-group {
  padding: var(--spacing-4) 0;
}
</style>
