/**
 * Banner 制图规格 — 与客户端 `f_ccg_video_client/src/constants/banner.ts` 保持一致
 * 后台提示与上传预览框比例以此为准。
 */

export type BannerType = 1 | 2 | 3

export interface BannerArtSpecItem {
  width: number
  height: number
  ratioLabel: string
  sizeLabel: string
  safeZone: string
  /** 管理端上传预览框宽高（可点可控，超宽类型略放高） */
  previewWidth: number
  previewHeight: number
}

export const BannerArtSpec: Record<BannerType, BannerArtSpecItem> = {
  // 4:3 — 对齐客户端移动端 aspect 4/3
  1: {
    width: 1600,
    height: 1200,
    ratioLabel: '4:3',
    sizeLabel: '1600×1200',
    safeZone: '关键主体放在画面中心；移动端按 4:3 展示，桌面可能轻微裁切边缘',
    previewWidth: 240,
    previewHeight: 180,
  },
  // 9.6:1 — 全站顶栏全宽×200 @2x
  2: {
    width: 3840,
    height: 400,
    ratioLabel: '9.6:1',
    sizeLabel: '3840×400',
    safeZone: '关键内容放在水平居中约 60% 区域（窄屏会裁左右）',
    previewWidth: 360,
    previewHeight: 64,
  },
  // 9.6:1 — 用户主页全宽×220 制图规格（与客户端 UserBannerPicker 一致）
  3: {
    width: 3840,
    height: 400,
    ratioLabel: '9.6:1',
    sizeLabel: '3840×400',
    safeZone: '关键内容放在水平居中约 60%、垂直中部；底部有头像与昵称遮罩',
    previewWidth: 360,
    previewHeight: 64,
  },
}
