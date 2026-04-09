/**
 * 中文 - 轮播图管理模块
 */
export default {
  title: '轮播图管理',
  list: {
    title: '轮播图列表',
    cover: '图片',
    href: '跳转链接',
    type: '类型',
    showStatus: '显示状态',
    partition: '所属分区',
  },
  filter: {
    type: '类型',
    typePlaceholder: '请选择类型',
    showStatus: '显示状态',
    showStatusPlaceholder: '请选择状态',
    partition: '所属分区',
    partitionPlaceholder: '请选择分区',
  },
  type: {
    carousel: '首页/分区轮播图',
    header: '顶部横幅',
    profile: '用户主页横幅',
  },
  status: {
    show: '显示',
    hide: '隐藏',
  },
  statusBadge: {
    defaultUserBanner: '系统默认',
    registerDefaultBanner: '注册默认',
  },
  form: {
    createTitle: '创建轮播图',
    editTitle: '编辑轮播图',
    cover: '图片',
    coverRequired: '请上传图片',
    coverTip: '建议尺寸：1920x480，支持 JPG/PNG，最大 5MB',
    href: '跳转链接',
    hrefPlaceholder: '请输入跳转链接（可选）',
    type: '类型',
    typePlaceholder: '请选择类型',
    showStatus: '显示状态',
    partition: '所属分区',
    partitionPlaceholder: '请选择分区',
  },
  actions: {
    create: '创建轮播图',
    setRegisterDefaultBanner: '设为注册时主页默认横幅',
    manageDefaultUserBanners: '添加/删除用户主页默认横幅',
  },
  setRegisterDefaultBanner: {
    title: '设置注册时主页默认横幅',
    confirm: '确定将当前横幅设为用户注册时主页默认横幅吗？',
  },
  defaultUserBanners: {
    title: '维护用户主页默认横幅',
    actionLabel: '操作类型',
    add: '添加到系统默认列表',
    remove: '从系统默认列表移除',
    selectedCount: '已选择 {count} 个横幅',
    selectedIds: '横幅 ID',
  },
  summary: {
    registerDefaultBanner: '注册时主页默认横幅',
    defaultBannerList: '系统默认用户主页横幅列表',
    empty: '暂无配置',
  },
  delete: {
    title: '删除轮播图',
    confirm: '确定要删除选中的 {count} 个轮播图吗？此操作不可恢复。',
  },
  tips: {
    createSuccess: '创建成功',
    updateSuccess: '更新成功',
    deleteSuccess: '删除成功',
    setRegisterDefaultBannerSuccess: '注册时主页默认横幅设置成功',
    addDefaultUserBannerSuccess: '已添加到系统默认用户主页横幅列表',
    removeDefaultUserBannerSuccess: '已从系统默认用户主页横幅列表移除',
    invalidDefaultBannerSelection: '只能选择已显示的“用户主页横幅”进行该操作',
  },
}
