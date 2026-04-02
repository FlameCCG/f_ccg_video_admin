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
  },
  filter: {
    type: 'タイプ',
    typePlaceholder: 'タイプを選択',
    showStatus: '表示状態',
    showStatusPlaceholder: '状態を選択',
  },
  type: {
    carousel: 'カルーセル',
    header: 'ヘッダーバナー',
  },
  status: {
    show: '表示',
    hide: '非表示',
  },
  form: {
    createTitle: 'バナー作成',
    editTitle: 'バナー編集',
    cover: '画像',
    coverRequired: '画像をアップロードしてください',
    coverTip: '推奨サイズ：1920x480、JPG/PNG対応、最大5MB',
    href: 'リンク',
    hrefPlaceholder: 'リンクURLを入力（任意）',
    type: 'タイプ',
    typePlaceholder: 'タイプを選択',
    showStatus: '表示設定',
  },
  actions: {
    create: 'バナー作成',
  },
  delete: {
    title: 'バナー削除',
    confirm: '選択した{count}件のバナーを削除しますか？この操作は取り消せません。',
  },
  tips: {
    createSuccess: '作成しました',
    updateSuccess: '更新しました',
    deleteSuccess: '削除しました',
  },
}
