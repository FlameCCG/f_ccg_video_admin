/**
 * Feedback Composable
 * 用户反馈管理（消息提示、通知、确认对话框）
 * Requirements: 20.4, 20.5
 */
import { useMessage, useNotification, useDialog } from 'naive-ui'
import type { MessageOptions, NotificationOptions, DialogOptions } from 'naive-ui'
import { useI18n } from 'vue-i18n'

export type FeedbackType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  /** 消息内容 */
  content: string
  /** 消息类型 */
  type?: FeedbackType
  /** 持续时间（毫秒） */
  duration?: number
  /** 是否可关闭 */
  closable?: boolean
}

export interface NotifyOptions {
  /** 标题 */
  title: string
  /** 内容 */
  content?: string
  /** 通知类型 */
  type?: FeedbackType
  /** 持续时间（毫秒），0 表示不自动关闭 */
  duration?: number
  /** 是否可关闭 */
  closable?: boolean
  /** 元数据 */
  meta?: string
}

export interface ConfirmOptions {
  /** 标题 */
  title: string
  /** 内容 */
  content: string
  /** 确认按钮文字 */
  confirmText?: string
  /** 取消按钮文字 */
  cancelText?: string
  /** 对话框类型 */
  type?: 'info' | 'success' | 'warning' | 'error'
  /** 是否显示图标 */
  showIcon?: boolean
}

/**
 * 用户反馈 composable
 */
export function useFeedback() {
  const message = useMessage()
  const notification = useNotification()
  const dialog = useDialog()
  const { t } = useI18n()

  /**
   * 显示轻量级消息提示
   */
  function toast(options: ToastOptions | string) {
    const opts: ToastOptions =
      typeof options === 'string' ? { content: options, type: 'info' } : options

    const { content, type = 'info', duration = 3000, closable = false } = opts

    const messageOptions: MessageOptions = {
      duration,
      closable,
    }

    switch (type) {
      case 'success':
        message.success(content, messageOptions)
        break
      case 'error':
        message.error(content, messageOptions)
        break
      case 'warning':
        message.warning(content, messageOptions)
        break
      case 'info':
      default:
        message.info(content, messageOptions)
        break
    }
  }

  /**
   * 显示成功消息
   */
  function success(content: string, duration = 3000) {
    toast({ content, type: 'success', duration })
  }

  /**
   * 显示错误消息
   */
  function error(content: string, duration = 5000) {
    toast({ content, type: 'error', duration })
  }

  /**
   * 显示警告消息
   */
  function warning(content: string, duration = 4000) {
    toast({ content, type: 'warning', duration })
  }

  /**
   * 显示信息消息
   */
  function info(content: string, duration = 3000) {
    toast({ content, type: 'info', duration })
  }

  /**
   * 显示通知
   */
  function notify(options: NotifyOptions) {
    const { title, content, type = 'info', duration = 4500, closable = true, meta } = options

    const notificationOptions: NotificationOptions = {
      title,
      content,
      duration,
      closable,
      meta,
    }

    switch (type) {
      case 'success':
        notification.success(notificationOptions)
        break
      case 'error':
        notification.error(notificationOptions)
        break
      case 'warning':
        notification.warning(notificationOptions)
        break
      case 'info':
      default:
        notification.info(notificationOptions)
        break
    }
  }

  /**
   * 显示确认对话框
   */
  function confirm(options: ConfirmOptions): Promise<boolean> {
    const {
      title,
      content,
      confirmText = t('common.confirm'),
      cancelText = t('common.cancel'),
      type = 'warning',
      showIcon = true,
    } = options

    return new Promise((resolve) => {
      const dialogOptions: DialogOptions = {
        title,
        content,
        positiveText: confirmText,
        negativeText: cancelText,
        showIcon,
        onPositiveClick: () => {
          resolve(true)
        },
        onNegativeClick: () => {
          resolve(false)
        },
        onClose: () => {
          resolve(false)
        },
        onMaskClick: () => {
          resolve(false)
        },
      }

      switch (type) {
        case 'success':
          dialog.success(dialogOptions)
          break
        case 'error':
          dialog.error(dialogOptions)
          break
        case 'warning':
          dialog.warning(dialogOptions)
          break
        case 'info':
        default:
          dialog.info(dialogOptions)
          break
      }
    })
  }

  /**
   * 显示删除确认对话框
   */
  function confirmDelete(itemName?: string): Promise<boolean> {
    const title = t('common.confirmDelete')
    const content = itemName
      ? t('common.confirmDeleteItem', { item: itemName })
      : t('common.confirmDeleteMessage')

    return confirm({
      title,
      content,
      type: 'error',
      confirmText: t('common.delete'),
    })
  }

  /**
   * 显示加载中消息
   */
  function loading(content?: string) {
    return message.loading(content ?? t('common.loading'), {
      duration: 0,
    })
  }

  /**
   * 操作成功反馈
   */
  function operationSuccess(operation?: string) {
    const content = operation
      ? t('common.operationSuccessWithName', { operation })
      : t('common.operationSuccess')
    success(content)
  }

  /**
   * 操作失败反馈
   */
  function operationError(errorMessage?: string) {
    const content = errorMessage ?? t('common.operationFailed')
    error(content)
  }

  return {
    // 消息提示
    toast,
    success,
    error,
    warning,
    info,
    loading,

    // 通知
    notify,

    // 对话框
    confirm,
    confirmDelete,

    // 操作反馈
    operationSuccess,
    operationError,
  }
}
