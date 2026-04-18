/**
 * 日本語 - 共通
 */
export default {
  // 操作ボタン
  confirm: '確認',
  cancel: 'キャンセル',
  save: '保存',
  delete: '削除',
  edit: '編集',
  add: '追加',
  create: '作成',
  update: '更新',
  search: '検索',
  reset: 'リセット',
  refresh: '更新',
  submit: '送信',
  close: '閉じる',
  back: '戻る',
  next: '次へ',
  prev: '前へ',
  finish: '完了',
  export: 'エクスポート',
  import: 'インポート',
  download: 'ダウンロード',
  upload: 'アップロード',
  view: '表示',
  detail: '詳細',
  more: 'もっと見る',
  expand: '展開',
  collapse: '折りたたむ',
  selectAll: 'すべて選択',
  deselectAll: '選択解除',
  unselectAll: '選択解除',
  batchDelete: '一括削除',
  batchOperation: '一括操作',
  clear: 'クリア',
  expandAll: 'すべて展開',
  collapseAll: 'すべて折りたたむ',
  noData: 'データがありません',
  noChanges: '変更なし',

  // ステータス
  status: 'ステータス',
  enable: '有効',
  disable: '無効',
  enabled: '有効',
  disabled: '無効',
  active: 'アクティブ',
  inactive: '非アクティブ',
  success: '成功',
  failed: '失敗',
  pending: '保留中',
  processing: '処理中',
  completed: '完了',
  loading: '読み込み中...',

  // ヒント
  tips: {
    confirmDelete: '削除してもよろしいですか？この操作は取り消せません。',
    confirmBatchDelete: '選択した{count}件を削除してもよろしいですか？この操作は取り消せません。',
    operationSuccess: '操作が成功しました',
    operationFailed: '操作が失敗しました',
    saveSuccess: '保存しました',
    saveFailed: '保存に失敗しました',
    deleteSuccess: '削除しました',
    deleteFailed: '削除に失敗しました',
    createSuccess: '作成しました',
    createFailed: '作成に失敗しました',
    updateSuccess: '更新しました',
    updateFailed: '更新に失敗しました',
    loadFailed: '読み込みに失敗しました',
    noData: 'データがありません',
    noResult: '一致する結果が見つかりません',
    required: 'この項目は必須です',
    invalidFormat: '形式が正しくありません',
    networkError: 'ネットワーク接続に失敗しました。ネットワークを確認してください',
    serverError: 'サーバーエラーが発生しました。後でもう一度お試しください',
    sessionExpired: 'セッションが期限切れです。再度ログインしてください',
    selectAtLeastOne: '少なくとも1つ選択してください',
    selectedActionSummary: '{count}件を選択中です。「{action}」を実行します。',
    noChanges: '変更なし',
  },

  // 削除確認
  confirmDelete: '削除の確認',
  confirmDeleteItem: '{item}を削除してもよろしいですか？この操作は取り消せません。',
  confirmDeleteMessage: '削除してもよろしいですか？この操作は取り消せません。',

  // 操作フィードバック
  operationSuccess: '操作が成功しました',
  operationSuccessWithName: '{operation}が成功しました',
  operationFailed: '操作が失敗しました',

  // テーブル
  table: {
    index: '番号',
    operation: '操作',
    createdAt: '作成日時',
    updatedAt: '更新日時',
    total: '合計 {total} 件',
    selected: '{count} 件選択中',
    pageSize: '{size} 件/ページ',
    jumpTo: '移動',
    page: 'ページ',
  },

  // フォーム
  form: {
    pleaseInput: '入力してください',
    pleaseSelect: '選択してください',
    pleaseUpload: 'アップロードしてください',
    startDate: '開始日',
    endDate: '終了日',
    startTime: '開始時刻',
    endTime: '終了時刻',
    keyword: 'キーワード',
    remark: '備考',
    description: '説明',
    sort: '並び順',
    preview: 'プレビュー',
    svgPlaceholder: 'SVGコードを入力してください。例：<svg>...</svg>',
    invalidSvg: 'SVG形式が無効です',
  },

  // 時間
  time: {
    today: '今日',
    yesterday: '昨日',
    thisWeek: '今週',
    lastWeek: '先週',
    thisMonth: '今月',
    lastMonth: '先月',
    thisYear: '今年',
    lastYear: '昨年',
    recent7Days: '過去7日間',
    recent30Days: '過去30日間',
    recent90Days: '過去90日間',
  },

  // 単位
  unit: {
    item: '件',
    piece: '個',
    times: '回',
    people: '人',
    day: '日',
    hour: '時間',
    minute: '分',
    second: '秒',
  },

  // エラーページ
  error: {
    title403: 'アクセス拒否',
    desc403: '申し訳ありませんが、このページにアクセスする権限がありません',
    title404: 'ページが見つかりません',
    desc404: '申し訳ありませんが、お探しのページは存在しません',
    title500: 'サーバーエラー',
    desc500: '申し訳ありませんが、サーバーで問題が発生しました',
    backHome: 'ホームに戻る',
    backPrev: '前のページに戻る',
    retry: '再試行',
  },

  // 確認ダイアログ
  dialog: {
    title: 'お知らせ',
    confirmTitle: '確認',
    warningTitle: '警告',
    dangerTitle: '危険な操作',
    info: '情報',
    success: '成功',
    warning: '警告',
    error: 'エラー',
  },

  // 空の状態
  empty: {
    default: 'データがありません',
    search: '一致する結果がありません',
    list: 'リストは空です',
    notification: '通知はありません',
    message: 'メッセージはありません',
  },

  // ファイルアップロード
  fileUpload: {
    dragText: 'クリックまたはファイルをドラッグしてアップロード',
    limitSize: 'ファイルサイズは{size}を超えることはできません',
    limitType: '{types}形式のみサポートされています',
    limitCount: '最大{count}ファイルまでアップロード可能',
    uploading: 'アップロード中...',
    uploadSuccess: 'アップロード成功',
    uploadFailed: 'アップロード失敗',
  },

  // コピー
  copy: {
    success: 'コピーしました',
    failed: 'コピーに失敗しました',
  },

  // はい/いいえ
  yes: 'はい',
  no: 'いいえ',
  all: 'すべて',
  none: 'なし',

  // その他
  comingSoon: '近日公開予定',
}
