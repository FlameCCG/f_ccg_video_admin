import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { NConfigProvider, NDropdown, NTooltip } from 'naive-ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaPlayerClass } from 'dashjs'
import type { VideoResource } from '@/api/types'
import type { DashEvents, DashPlayerOptions } from '@/utils/dash'
import { setDashQuality } from '@/utils/dash'
import enVideo from '@/locales/en-US/video'
import VideoPlayer from './VideoPlayer.vue'

const dash = vi.hoisted(() => ({
  supported: false,
  handlers: new Map<
    string,
    (event?: { mediaType: string; newRepresentation: { index: number; height: number } }) => void
  >(),
  signal: undefined as AbortSignal | undefined,
  currentIndex: 0,
}))

vi.mock('@/utils/dash', () => ({
  isDashResource: (resource: VideoResource) => resource.format === 'dash',
  isDashSupported: () => dash.supported,
  attachDashToVideo: vi.fn((_video: HTMLVideoElement, _url: string, options: DashPlayerOptions) => {
    dash.signal = options.signal
    const instance = {
      on: (
        event: string,
        handler: (event?: {
          mediaType: string
          newRepresentation: { index: number; height: number }
        }) => void
      ) => dash.handlers.set(event, handler),
      isReady: () => true,
      getRepresentationsByType: () => [],
      getCurrentRepresentationForType: () => ({
        index: dash.currentIndex,
        height: dash.currentIndex === 0 ? 1080 : 720,
      }),
    } as unknown as MediaPlayerClass
    options.onDashCreated?.(instance, {
      BUFFER_LEVEL_UPDATED: 'bufferLevelUpdated',
      STREAM_INITIALIZED: 'streamInitialized',
      QUALITY_CHANGE_RENDERED: 'qualityChangeRendered',
      ERROR: 'error',
    } as DashEvents)
    return Promise.resolve(instance)
  }),
  destroyDashPlayer: vi.fn(),
  getDashRepresentations: vi.fn(() => [
    { dashIndex: 0, label: '1080p', height: 1080, bandwidth: 1000000 },
    { dashIndex: 1, label: '720p', height: 720, bandwidth: 500000 },
  ]),
  setDashQuality: vi.fn(),
  buildDashLabelMap: vi.fn(
    () =>
      new Map([
        [0, '1080p'],
        [1, '720p'],
      ])
  ),
}))

function resource(format = 'mp4'): VideoResource {
  return {
    id: 1,
    resolution: '1080p',
    sourceFileName: 'video',
    fileUrl: `/video.${format === 'dash' ? 'mpd' : 'mp4'}`,
    fileSize: 1000,
    bitrate: 1000,
    format,
    codec: 'h264',
    isVip: false,
    isSource: true,
  }
}

type PlayerWrapper = VueWrapper<InstanceType<typeof VideoPlayer>>
const wrappers: PlayerWrapper[] = []
const playMock = vi.fn(() => Promise.resolve())

async function createPlayer(resources = [resource()]): Promise<PlayerWrapper> {
  const wrapper = mount(VideoPlayer, {
    props: { resources },
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'en',
          messages: { en: { video: enVideo } },
          missingWarn: false,
          fallbackWarn: false,
        }),
      ],
    },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

function setMedia(wrapper: PlayerWrapper, ranges: [number, number][], duration = 100) {
  const video = wrapper.get('video').element
  Object.defineProperties(video, {
    duration: { configurable: true, value: duration },
    buffered: {
      configurable: true,
      value: {
        length: ranges.length,
        start: (index: number) => ranges[index]![0],
        end: (index: number) => ranges[index]![1],
      },
    },
  })
}

function segments(wrapper: PlayerWrapper) {
  return wrapper.findAll<HTMLElement>('.video-player__buffered').map(({ element }) => ({
    left: element.style.left,
    width: element.style.width,
  }))
}

beforeEach(() => {
  dash.supported = false
  dash.handlers.clear()
  dash.currentIndex = 0
  vi.clearAllMocks()
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(playMock)
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('VideoPlayer buffer display', () => {
  it('shows MP4 buffered ranges with gaps and updates them on progress', async () => {
    const wrapper = await createPlayer()
    setMedia(wrapper, [[0, 30]])
    await wrapper.get('video').trigger('loadedmetadata')
    expect(segments(wrapper)).toEqual([{ left: '0%', width: '30%' }])

    setMedia(wrapper, [
      [0, 30],
      [60, 80],
    ])
    await wrapper.get('video').trigger('progress')
    expect(segments(wrapper)).toEqual([
      { left: '0%', width: '30%' },
      { left: '60%', width: '20%' },
    ])
  })

  it('refreshes after seeking and removes evicted or empty buffered ranges', async () => {
    const wrapper = await createPlayer()
    setMedia(wrapper, [[0, 30]])
    await wrapper.get('video').trigger('durationchange')
    setMedia(wrapper, [[60, 80]])
    await wrapper.get('video').trigger('seeked')
    expect(segments(wrapper)).toEqual([{ left: '60%', width: '20%' }])
    setMedia(wrapper, [])
    await wrapper.get('video').trigger('timeupdate')
    expect(segments(wrapper)).toEqual([])
  })

  it('clamps ranges and handles unknown or non-finite duration', async () => {
    const wrapper = await createPlayer()
    for (const duration of [0, NaN, Infinity]) {
      setMedia(wrapper, [[0, 30]], duration)
      await wrapper.get('video').trigger('durationchange')
      expect(segments(wrapper)).toEqual([])
      expect(
        wrapper.get('.video-player__progress [role="slider"]').attributes('aria-valuemax')
      ).toBe('100')
    }
    setMedia(wrapper, [
      [-5, 30],
      [80, 120],
      [110, 130],
    ])
    await wrapper.get('video').trigger('durationchange')
    expect(segments(wrapper)).toEqual([
      { left: '0%', width: '30%' },
      { left: '80%', width: '20%' },
    ])
  })

  it.each(['loadstart', 'emptied'])('clears stale ranges on %s', async (event) => {
    const wrapper = await createPlayer()
    setMedia(wrapper, [[0, 60]])
    await wrapper.get('video').trigger('durationchange')
    await wrapper.get('video').trigger(event)
    expect(segments(wrapper)).toEqual([])
  })

  it('clears stale ranges when the resource changes', async () => {
    const wrapper = await createPlayer()
    setMedia(wrapper, [[0, 60]])
    await wrapper.get('video').trigger('durationchange')
    await wrapper.setProps({ resources: [{ ...resource(), id: 2, fileUrl: '/other.mp4' }] })
    await flushPromises()
    expect(segments(wrapper)).toEqual([])
  })

  it('refreshes DASH buffers without a native progress event and ignores stale callbacks', async () => {
    dash.supported = true
    const wrapper = await createPlayer([resource('dash')])
    setMedia(wrapper, [[0, 20]])
    await wrapper.get('video').trigger('durationchange')
    const updateBuffer = dash.handlers.get('bufferLevelUpdated')!
    setMedia(wrapper, [[5, 40]])
    updateBuffer()
    await nextTick()
    expect(segments(wrapper)).toEqual([{ left: '5%', width: '35%' }])

    await wrapper.setProps({ resources: [resource()] })
    await flushPromises()
    expect(dash.signal?.aborted).toBe(true)
    updateBuffer()
    await nextTick()
    expect(segments(wrapper)).toEqual([])
  })
})

it('keeps player buttons readable and the buffer visible under an inherited light theme', async () => {
  const host = mount(NConfigProvider, {
    props: {
      themeOverrides: {
        Button: { colorQuaternary: '#ffffff', textColor: '#222222' },
        Slider: { railColor: '#ffffff', railColorHover: '#ffffff' },
      },
    },
    slots: { default: () => h(VideoPlayer, { resources: [resource()] }) },
    global: {
      plugins: [
        createI18n({ legacy: false, locale: 'en', missingWarn: false, fallbackWarn: false }),
      ],
    },
  })
  try {
    await flushPromises()
    for (const button of host.findAll<HTMLElement>('.video-player__controls .n-button')) {
      expect(button.element.style.getPropertyValue('--n-color')).toBe('transparent')
      expect(button.element.style.getPropertyValue('--n-text-color')).toBe(
        'rgb(var(--player-ink-rgb))'
      )
    }
    const progress = host.get<HTMLElement>('.video-player__progress .n-slider').element.style
    expect(progress.getPropertyValue('--n-rail-color')).toBe('transparent')
    expect(progress.getPropertyValue('--n-rail-color-hover')).toBe('transparent')
    expect(progress.getPropertyValue('--n-handle-size')).toBe('12px')
  } finally {
    host.unmount()
  }
})

function qualityMenu(wrapper: PlayerWrapper) {
  return wrapper
    .findAllComponents(NDropdown)
    .find((menu) =>
      menu
        .props('options')
        ?.some((option) => 'label' in option && String(option.label).includes('720p'))
    )!
}

const mp4Qualities = () => [
  resource(),
  { ...resource(), id: 2, resolution: '720p', fileUrl: '/720.mp4' },
  { ...resource(), id: 3, resolution: '360p', fileUrl: '/360.mp4' },
]

describe('VideoPlayer quality changes', () => {
  it('confirms MP4 only after loading the new source and restoring the playback position', async () => {
    const wrapper = await createPlayer(mp4Qualities())
    const video = wrapper.get('video')
    video.element.currentTime = 42
    await video.trigger('timeupdate')
    await video.trigger('play')
    qualityMenu(wrapper).vm.$emit('select', 1)
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('Switching to 720p…')
    expect(video.attributes('src')).toBe('/720.mp4')
    expect(playMock).not.toHaveBeenCalled()

    await video.trigger('loadstart')
    setMedia(wrapper, [[40, 60]])
    Object.defineProperty(video.element, 'readyState', { configurable: true, value: 1 })
    await video.trigger('loadedmetadata')
    expect(video.element.currentTime).toBe(42)
    await video.trigger('canplay')
    expect(wrapper.get('[role="status"]').text()).toBe('Switching to 720p…')
    Object.defineProperties(video.element, {
      readyState: { configurable: true, value: 3 },
      seeking: { configurable: true, value: true },
    })
    await video.trigger('canplay')
    expect(wrapper.get('[role="status"]').text()).toBe('Switching to 720p…')
    Object.defineProperty(video.element, 'seeking', { configurable: true, value: false })
    await video.trigger('seeked')
    expect(wrapper.get('[role="status"]').text()).toBe('Switched to 720p')
    expect(playMock).toHaveBeenCalledTimes(1)
  })

  it('cancels superseded MP4 callbacks and keeps paused playback paused', async () => {
    const wrapper = await createPlayer(mp4Qualities())
    qualityMenu(wrapper).vm.$emit('select', 1)
    await flushPromises()
    qualityMenu(wrapper).vm.$emit('select', 2)
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('Switching to 360p…')
    setMedia(wrapper, [[0, 20]])
    Object.defineProperty(wrapper.get('video').element, 'readyState', {
      configurable: true,
      value: 3,
    })
    await wrapper.get('video').trigger('loadedmetadata')
    await wrapper.get('video').trigger('canplay')
    expect(wrapper.get('[role="status"]').text()).toBe('Switched to 360p')
    expect(playMock).not.toHaveBeenCalled()
  })

  it('reports MP4 load failure without later claiming success', async () => {
    const wrapper = await createPlayer(mp4Qualities())
    qualityMenu(wrapper).vm.$emit('select', 1)
    await flushPromises()
    await wrapper.get('video').trigger('error')
    expect(wrapper.get('[role="status"]').text()).toContain('Could not switch to 720p')
    await wrapper.get('video').trigger('loadedmetadata')
    await wrapper.get('video').trigger('canplay')
    expect(wrapper.get('[role="status"]').text()).toContain('Could not switch')
    await wrapper.setProps({ resources: [resource()] })
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('waits for the requested DASH representation to render', async () => {
    dash.supported = true
    const wrapper = await createPlayer([resource('dash')])
    // 请求 API 可立即返回目标档位，但此时旧缓冲片段仍在播放。
    vi.mocked(setDashQuality).mockImplementationOnce(() => {
      dash.currentIndex = 1
    })
    qualityMenu(wrapper).vm.$emit('select', 1)
    await nextTick()
    expect(setDashQuality).toHaveBeenCalledWith(expect.anything(), 1)
    expect(wrapper.get('[role="status"]').text()).toBe('Switching to 720p…')
    expect(qualityMenu(wrapper).text()).toBe('1080p')
    await wrapper.get('video').trigger('canplay')
    const rendered = dash.handlers.get('qualityChangeRendered')!
    rendered({ mediaType: 'audio', newRepresentation: { index: 1, height: 720 } })
    rendered({ mediaType: 'video', newRepresentation: { index: 0, height: 1080 } })
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toBe('Switching to 720p…')
    rendered({ mediaType: 'video', newRepresentation: { index: 1, height: 720 } })
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toBe('Switched to 720p')
    expect(qualityMenu(wrapper).text()).toBe('720p')
  })

  it('reports DASH failure and ignores old render events after changing videos', async () => {
    dash.supported = true
    const wrapper = await createPlayer([resource('dash')])
    qualityMenu(wrapper).vm.$emit('select', 1)
    await nextTick()
    const rendered = dash.handlers.get('qualityChangeRendered')!
    dash.handlers.get('error')!()
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('Could not switch to 720p')
    await wrapper.setProps({ resources: [resource()] })
    await flushPromises()
    rendered({ mediaType: 'video', newRepresentation: { index: 1, height: 720 } })
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('confirms the rendered DASH quality immediately and distinguishes enabling automatic quality', async () => {
    dash.supported = true
    const wrapper = await createPlayer([resource('dash')])
    dash.handlers.get('qualityChangeRendered')!({
      mediaType: 'video',
      newRepresentation: { index: 0, height: 1080 },
    })
    qualityMenu(wrapper).vm.$emit('select', 0)
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toBe('Switched to 1080p')
    qualityMenu(wrapper).vm.$emit('select', -1)
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toBe('Automatic quality enabled')
  })
})

describe('VideoPlayer fullscreen menus', () => {
  it('renders quality menus and tooltips inside the fullscreen element', async () => {
    const wrapper = await createPlayer(mp4Qualities())
    const playerElement = wrapper.get<HTMLElement>('.video-player').element
    const fullscreen = vi.fn((): Element | null => playerElement)
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: fullscreen })
    document.dispatchEvent(new Event('fullscreenchange'))
    await nextTick()
    for (const overlay of [
      ...wrapper.findAllComponents(NDropdown),
      ...wrapper.findAllComponents(NTooltip),
    ]) {
      expect(overlay.props().to).toBe(playerElement)
    }
    await qualityMenu(wrapper).get('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.n-dropdown-menu').exists()).toBe(true)
    expect(wrapper.get('.n-dropdown-menu').text()).toContain('720p')
    fullscreen.mockReturnValue(null)
    document.dispatchEvent(new Event('fullscreenchange'))
    await nextTick()
    expect(qualityMenu(wrapper).props('to')).toBeUndefined()
    Reflect.deleteProperty(document, 'fullscreenElement')
  })

  it('keeps controls visible while a menu is open during playback', async () => {
    const wrapper = await createPlayer(mp4Qualities())
    vi.useFakeTimers()
    await wrapper.get('video').trigger('play')
    qualityMenu(wrapper).vm.$emit('update:show', true)
    await nextTick()
    await vi.advanceTimersByTimeAsync(3500)
    expect(wrapper.get<HTMLElement>('.video-player__controls').element.style.display).not.toBe(
      'none'
    )
    qualityMenu(wrapper).vm.$emit('update:show', false)
    await vi.advanceTimersByTimeAsync(3500)
    expect(wrapper.get<HTMLElement>('.video-player__controls').element.style.display).toBe('none')
  })
})
