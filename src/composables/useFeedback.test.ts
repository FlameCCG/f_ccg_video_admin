import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFeedback } from './useFeedback'

const mockMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  loading: vi.fn(),
}

const mockNotification = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

const mockDialog = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

vi.mock('naive-ui', () => ({
  useMessage: () => mockMessage,
  useNotification: () => mockNotification,
  useDialog: () => mockDialog,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, args?: unknown) => `${key}${args ? JSON.stringify(args) : ''}`,
  }),
}))

describe('useFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call toast / success / error / warning / info message methods', () => {
    const { success, error, warning, info, toast } = useFeedback()

    toast('test message')
    expect(mockMessage.info).toHaveBeenCalledWith('test message', expect.any(Object))

    success('success message')
    expect(mockMessage.success).toHaveBeenCalledWith('success message', expect.any(Object))

    error('error message')
    expect(mockMessage.error).toHaveBeenCalledWith('error message', expect.any(Object))

    warning('warning message')
    expect(mockMessage.warning).toHaveBeenCalledWith('warning message', expect.any(Object))

    info('info message')
    expect(mockMessage.info).toHaveBeenCalledWith('info message', expect.any(Object))
  })

  it('should call notify methods', () => {
    const { notify } = useFeedback()

    notify({ title: 'Notification Title', content: 'content text', type: 'success' })
    expect(mockNotification.success).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Notification Title', content: 'content text' })
    )
  })

  it('should call confirm dialog methods', async () => {
    const { confirm } = useFeedback()

    mockDialog.warning.mockImplementation((opts: unknown) => {
      const options = opts as { onPositiveClick: () => void }
      options.onPositiveClick()
    })

    const result = await confirm({ title: 'Confirm', content: 'Are you sure?' })
    expect(result).toBe(true)
    expect(mockDialog.warning).toHaveBeenCalled()
  })
})
