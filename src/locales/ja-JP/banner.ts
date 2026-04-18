/**
 * 日本語 - バナー管理モジュール
 */
export default {
  title: 'バナー管理',
  list: {
    title: 'バナー一覧',
    cover: '画像',
    href: 'リンク',
    type: 'タイプ',
    showStatus: '表示状態',
    partition: 'パーティション',
  },
  filter: {
    type: 'タイプ',
    typePlaceholder: 'タイプを選択',
    showStatus: '表示状態',
    showStatusPlaceholder: '状態を選択',
    partition: 'パーティション',
    partitionPlaceholder: 'パーティションを選択',
  },
  type: {
    carousel: 'ホーム/パーティションカルーセル',
    header: 'ヘッダーバナー',
    profile: 'プロフィールバナー',
  },
  status: {
    show: '表示',
    hide: '非表示',
  },
  statusBadge: {
    defaultUserBanner: 'システム既定',
    registerDefaultBanner: '登録既定',
  },
  form: {
    createTitle: 'バナー作成',
    editTitle: 'バナー編集',
    cover: '画像',
    coverRequired: '画像をアップロードしてください',
    coverTip: '推奨サイズ：1920x480、JPG/PNG対応、最大20MB',
    href: 'リンク',
    hrefPlaceholder: 'リンクURLを入力（任意）',
    type: 'タイプ',
    typePlaceholder: 'タイプを選択',
    showStatus: '表示設定',
    partition: 'パーティション',
    partitionPlaceholder: 'パーティションを選択',
  },
  actions: {
    create: 'バナー作成',
    setRegisterDefaultBanner: '登録時の既定ホームバナーに設定',
    manageDefaultUserBanners: 'システム既定プロフィールバナーを追加/削除',
  },
  setRegisterDefaultBanner: {
    title: '登録時の既定ホームバナー設定',
    confirm: 'このバナーをユーザー登録時の既定ホームバナーに設定しますか？',
  },
  defaultUserBanners: {
    title: 'システム既定プロフィールバナー管理',
    actionLabel: '操作タイプ',
    add: '既定リストに追加',
    remove: '既定リストから削除',
    selectedCount: '{count}件のバナーを選択中',
    selectedIds: 'バナー ID',
  },
  summary: {
    registerDefaultBanner: '登録時の既定ホームバナー',
    defaultBannerList: 'システム既定プロフィールバナー一覧',
    empty: '未設定',
  },
  delete: {
    title: 'バナー削除',
    confirm: '選択した{count}件のバナーを削除しますか？この操作は取り消せません。',
  },
  tips: {
    createSuccess: '作成しました',
    updateSuccess: '更新しました',
    deleteSuccess: '削除しました',
    setRegisterDefaultBannerSuccess: '登録時の既定ホームバナーを設定しました',
    addDefaultUserBannerSuccess: 'システム既定プロフィールバナー一覧に追加しました',
    removeDefaultUserBannerSuccess: 'システム既定プロフィールバナー一覧から削除しました',
    invalidDefaultBannerSelection: '表示中のプロフィールバナーのみこの操作に使用できます',
  },
}
