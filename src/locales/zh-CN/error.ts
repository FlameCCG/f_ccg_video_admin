/**
 * 错误页面中文语言包
 */
export default {
  goBack: '返回上一页',
  goHome: '返回首页',
  forbidden: {
    title: '403 - 无权访问',
    description: '抱歉，您没有权限访问此页面。请联系管理员获取访问权限。',
  },
  notFound: {
    title: '404 - 页面不存在',
    description: '抱歉，您访问的页面不存在。请检查 URL 是否正确。',
  },
  menuComponent: {
    missingPathTitle: '“{title}”菜单尚未配置前端组件路径',
    unavailableTitle: '“{title}”菜单的前端文件还没有建立',
    missingPath: '请在菜单权限中填写 component 字段后再访问该页面。',
    fileNotFound: '配置的组件文件不存在，请创建文件或修正菜单组件路径。',
    renderError: '组件文件存在，但加载或渲染失败，请检查该页面的前端代码。',
    componentPath: '当前 component 路径',
  },
}
