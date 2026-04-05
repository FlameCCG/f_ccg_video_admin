/**
 * 中文 - 通知管理模块
 */
export default {
  title: '通知管理',
  list: {
    pageTitle: '全站通知',
    title: '标题',
    content: '内容',
    receiver: '接收者',
    senderAvatar: '头像',
    sender: '发送者',
    link: '链接',
    createdAt: '创建时间',
  },
  receiver: {
    all: '全员',
    specific: '指定用户',
  },
  form: {
    createTitle: '发送通知',
    editTitle: '编辑通知',
    title: '标题',
    titlePlaceholder: '请输入通知标题',
    titleRequired: '请输入通知标题',
    content: '内容',
    contentPlaceholder: '请输入通知内容',
    contentRequired: '请输入通知内容',
    receiver: '接收者',
    receiverIdPlaceholder: '请输入用户 ID',
    link: '跳转链接',
    linkPlaceholder: '请输入链接，如 example.com 或 http://example.com（可选）',
    videoId: '关联视频',
    videoIdPlaceholder: '请输入视频 ID（可选）',
    videoTitle: '视频标题',
    videoTitlePlaceholder: '请输入视频标题（可选）',
  },
  actions: {
    create: '发送通知',
  },
  delete: {
    title: '删除通知',
    confirm: '确定要删除选中的 {count} 条通知吗？此操作不可恢复。',
  },
  tips: {
    createSuccess: '发送成功',
    updateSuccess: '更新成功',
    deleteSuccess: '删除成功',
  },
}
