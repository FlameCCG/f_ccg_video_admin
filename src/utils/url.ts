/**
 * URL 相关工具
 */

const ABSOLUTE_URL_RE = /^[a-zA-Z][a-zA-Z\d+\-.]*:/

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

/**
 * 规范化通知/外链跳转 URL。
 * 避免 `chatgpt.com` 这类无协议地址被浏览器当成相对路径（如 `/message/chatgpt.com`）。
 * - `/video/1` 保持站内路径
 * - `https://example.com` 保持绝对地址
 * - `//example.com` → `http://example.com`
 * - `chatgpt.com` → `http://chatgpt.com`
 * 默认补 http，兼容性更好；明确需要 https 时可直接填写。
 */
export function normalizeExternalHref(url?: string | null): string {
  if (!url) return ''

  const trimmed = url.trim()
  if (!trimmed) return ''

  if (ABSOLUTE_URL_RE.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `http:${trimmed}`
  if (trimmed.startsWith('/')) return trimmed

  return `http://${trimmed}`
}
