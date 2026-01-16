/**
 * 用户状态 Store
 * 管理当前登录用户信息
 * Requirements: 5.1
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getUserInfo, switchRole } from '@/api/user'
import type { AdminUserInfo, SwitchRoleParams } from '@/api/types'

/**
 * 用户状态 Store
 */
export const useUserStore = defineStore('user', () => {
  // ==================== 状态 ====================

  /** 用户信息 */
  const userInfo = ref<AdminUserInfo | null>(null)

  /** 是否正在加载 */
  const isLoading = ref(false)

  /** 是否已加载 */
  const isLoaded = ref(false)

  // ==================== 计算属性 ====================

  /** 用户 ID */
  const userId = computed(() => userInfo.value?.id ?? 0)

  /** 用户名 */
  const username = computed(() => userInfo.value?.username ?? '')

  /** 用户头像 */
  const avatar = computed(() => userInfo.value?.avatar ?? '')

  /** 用户邮箱 */
  const email = computed(() => userInfo.value?.email ?? '')

  /** 当前角色 ID */
  const currentRoleId = computed(() => userInfo.value?.currentRoleID ?? 0)

  /** 角色名列表 */
  const roleNames = computed(() => userInfo.value?.roleNames ?? [])

  /** 角色映射表（角色ID -> 角色名） */
  const roleMap = computed(() => userInfo.value?.roleMap ?? {})

  /** 角色列表（用于切换，包含 ID 和名称） */
  const roleList = computed(() => {
    const map = roleMap.value
    return Object.entries(map).map(([id, name]) => ({
      id: Number(id),
      name,
    }))
  })

  /** 是否有多个角色（可切换） */
  const hasMultipleRoles = computed(() => roleList.value.length > 1)

  // ==================== Actions ====================

  /**
   * 获取用户信息
   */
  async function fetchUserInfo(): Promise<AdminUserInfo> {
    if (isLoading.value) {
      // 如果正在加载，等待加载完成
      return new Promise((resolve, reject) => {
        const checkLoading = setInterval(() => {
          if (!isLoading.value) {
            clearInterval(checkLoading)
            if (userInfo.value) {
              resolve(userInfo.value)
            } else {
              reject(new Error('Failed to load user info'))
            }
          }
        }, 100)
      })
    }

    isLoading.value = true

    try {
      const data = await getUserInfo()
      userInfo.value = data
      isLoaded.value = true
      return data
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 切换角色
   * @param params 切换角色参数
   */
  async function switchUserRole(params: SwitchRoleParams): Promise<void> {
    await switchRole(params)

    // 切换成功后，更新本地状态
    if (userInfo.value) {
      userInfo.value.currentRoleID = params.roleId
    }
  }

  /**
   * 更新用户信息（本地）
   * @param info 部分用户信息
   */
  function updateUserInfo(info: Partial<AdminUserInfo>): void {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...info }
    }
  }

  /**
   * 重置用户状态
   */
  function resetUser(): void {
    userInfo.value = null
    isLoaded.value = false
    isLoading.value = false
  }

  return {
    // 状态
    userInfo: computed(() => userInfo.value),
    isLoading: computed(() => isLoading.value),
    isLoaded: computed(() => isLoaded.value),

    // 计算属性
    userId,
    username,
    avatar,
    email,
    currentRoleId,
    roleNames,
    roleMap,
    roleList,
    hasMultipleRoles,

    // Actions
    fetchUserInfo,
    switchUserRole,
    updateUserInfo,
    resetUser,
  }
})
