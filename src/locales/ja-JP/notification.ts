/**
 * 日本語 - 通知管理モジュール
 */
export default {
  title: '通知管理',
  list: {
    pageTitle: 'サイト通知',
    title: 'タイトル',
    content: '内容',
    receiver: '受信者',
    sender: '送信者',
    link: 'リンク',
    createdAt: '作成日時',
  },
  receiver: {
    all: '全員',
    specific: '指定ユーザー',
  },
  form: {
    createTitle: '通知送信',
    editTitle: '通知編集',
    title: 'タイトル',
    titlePlaceholder: '通知タイトルを入力',
    titleRequired: '通知タイトルを入力してください',
    content: '内容',
    contentPlaceholder: '通知内容を入力',
    contentRequired: '通知内容を入力してください',
    receiver: '受信者',
    receiverIdPlaceholder: 'ユーザーIDを入力',
    link: 'リンク',
    linkPlaceholder: 'リンクURLを入力（任意）',
    videoId: '関連動画',
    videoIdPlaceholder: '動画IDを入力（任意）',
    videoTitle: '動画タイトル',
    videoTitlePlaceholder: '動画タイトルを入力（任意）',
  },
  actions: {
    create: '通知送信',
  },
  delete: {
    title: '通知削除',
    confirm: '選択した{count}件の通知を削除しますか？この操作は取り消せません。',
  },
  tips: {
    createSuccess: '送信しました',
    updateSuccess: '更新しました',
    deleteSuccess: '削除しました',
  },
}
