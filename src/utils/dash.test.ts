import { describe, expect, it, vi } from 'vitest'
import type { MediaPlayerClass } from 'dashjs'

import { getDashRepresentations } from './dash'

function createDash(representations: unknown[]): MediaPlayerClass {
  return {
    getRepresentationsByType: vi.fn().mockReturnValue(representations),
  } as unknown as MediaPlayerClass
}

describe('getDashRepresentations', () => {
  it('returns the only video representation for a single-quality manifest', () => {
    const dash = createDash([
      {
        index: 0,
        height: 360,
        bandwidth: 680_000,
      },
    ])

    expect(getDashRepresentations(dash, [{ resolution: '360p 流畅', bitrate: 680 }])).toEqual([
      {
        dashIndex: 0,
        label: '360p 流畅',
        height: 360,
        bandwidth: 680_000,
      },
    ])
  })

  it('returns an empty list when the manifest has no video representation', () => {
    expect(getDashRepresentations(createDash([]))).toEqual([])
  })
})
