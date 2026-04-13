/**
 * エラーページ日本語言語パック
 */
export default {
  goBack: '前のページに戻る',
  goHome: 'ホームに戻る',
  forbidden: {
    title: '403 - アクセス禁止',
    description:
      '申し訳ありませんが、このページにアクセスする権限がありません。管理者にお問い合わせください。',
  },
  notFound: {
    title: '404 - ページが見つかりません',
    description: '申し訳ありませんが、お探しのページは存在しません。URLをご確認ください。',
  },
  menuComponent: {
    missingPathTitle: '「{title}」メニューにコンポーネントパスが設定されていません',
    unavailableTitle: '「{title}」メニューのフロントエンドファイルはまだ作成されていません',
    missingPath: 'メニュー管理で component 項目を設定してからアクセスしてください。',
    fileNotFound: '設定されたファイルが存在しません。ファイルを作成するかパスを修正してください。',
    renderError:
      'コンポーネントは存在しますが、読み込みまたは描画に失敗しました。コードを確認してください。',
    componentPath: '現在の component パス',
  },
}
