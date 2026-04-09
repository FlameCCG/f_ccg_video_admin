/**
 * URL 相关工具
 */

/**
 * 规范化资源 URL
 * 修复后端偶发返回的 `http:/host/...` / `https:/host/...` 这类协议斜杠缺失问题。
 */
export function normalizeResourceUrl(url?: string | null): string {
  if (!url) return ''

  const trimmed = url.trim()
  if (!trimmed) return ''

  if (/^https?:\/(?!\/)/i.test(trimmed)) {
    return trimmed.replace(/^((?:https?)):\/(?!\/)/i, '$1://')
  }

  if (/^https?:\\(?!\\)/i.test(trimmed)) {
    return trimmed.replace(/^((?:https?)):\\(?!\\)/i, '$1://').replace(/\\/g, '/')
  }

  return trimmed
}
