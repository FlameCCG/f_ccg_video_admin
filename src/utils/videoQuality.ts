/** 保持当前视频播放，直到备用视频缓冲、解码并追上当前进度。 */
export function prepareVideoQuality(
  current: HTMLVideoElement,
  candidate: HTMLVideoElement,
  url: string,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    let animationFrame = 0
    let videoFrame: number | null = null
    let frameReady = false
    let metadataReady = false
    let playPending = false
    let settled = false
    const supportsVideoFrame = typeof candidate.requestVideoFrameCallback === 'function'

    const cleanup = (): void => {
      window.clearTimeout(timeout)
      cancelAnimationFrame(animationFrame)
      if (videoFrame !== null) candidate.cancelVideoFrameCallback(videoFrame)
      candidate.removeEventListener('loadedmetadata', onMetadata)
      candidate.removeEventListener('error', onError)
      signal.removeEventListener('abort', onAbort)
    }
    const finish = (error?: Error): void => {
      if (settled) return
      settled = true
      cleanup()
      if (error) reject(error)
      else resolve()
    }
    const onAbort = (): void => finish(new DOMException('Quality switch cancelled', 'AbortError'))
    const onError = (): void => finish(new Error('Could not prepare video quality'))
    const timeout = window.setTimeout(onError, 30_000)

    const watchFrame = (): void => {
      frameReady = false
      if (!supportsVideoFrame) return
      if (videoFrame !== null) candidate.cancelVideoFrameCallback(videoFrame)
      videoFrame = candidate.requestVideoFrameCallback(() => {
        videoFrame = null
        frameReady = true
      })
    }
    const targetTime = (lead = 0): number => {
      const end = Number.isFinite(candidate.duration) ? candidate.duration : Infinity
      return Math.max(0, Math.min(current.currentTime + lead, Math.max(0, end - 0.01)))
    }
    const onMetadata = (): void => {
      metadataReady = true
      candidate.currentTime = targetTime()
      watchFrame()
    }
    const synchronize = (): void => {
      if (settled) return
      animationFrame = requestAnimationFrame(synchronize)
      if (!metadataReady) return

      candidate.playbackRate = current.playbackRate
      const paused = current.paused || current.ended
      if (paused && !candidate.paused) candidate.pause()
      if (current.seeking || candidate.seeking || candidate.readyState < 3) return

      // 以实时进度对齐，预加载期间用户仍可拖动进度、暂停和修改倍速。
      const tolerance = paused ? 0.02 : 0.08
      if (Math.abs(candidate.currentTime - targetTime()) > tolerance) {
        candidate.currentTime = targetTime(paused ? 0 : 0.04)
        watchFrame()
        return
      }

      if (!paused && candidate.paused) {
        if (!playPending) {
          playPending = true
          watchFrame()
          void candidate.play().then(
            () => {
              playPending = false
            },
            () => finish(new Error('Could not start prepared video'))
          )
        }
        return
      }
      if (playPending || (supportsVideoFrame && !frameReady)) return

      // 给交接留出缓冲余量，避免只解码了第一帧就切过去再次等待网络。
      const requiredEnd = Math.min(candidate.currentTime + 0.5, candidate.duration)
      for (let i = 0; i < candidate.buffered.length; i++) {
        if (
          candidate.buffered.start(i) <= candidate.currentTime &&
          candidate.buffered.end(i) >= requiredEnd
        ) {
          finish()
          return
        }
      }
    }

    candidate.addEventListener('loadedmetadata', onMetadata)
    candidate.addEventListener('error', onError)
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      onAbort()
      return
    }
    candidate.muted = true
    candidate.autoplay = false
    candidate.preload = 'auto'
    candidate.playbackRate = current.playbackRate
    candidate.src = url
    candidate.load()
    animationFrame = requestAnimationFrame(synchronize)
  })
}
