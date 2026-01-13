# 后台-视频管理

分类说明：视频审核、举报、分区管理

Base URL：/v1

## [DELETE] 管理员删除弹幕

- 接口路径: DELETE /admin/video/danmu
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 管理员批量删除弹幕（需管理员权限）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| danmuIds | body | array<integer> | 是 | 弹幕ID列表 |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | - |
| data.deleted | integer(int64) | 删除数量 |

响应示例:

```json
{
  "code": 0,
  "data": {
    "deleted": 1
  },
  "msg": "删除成功"
}
```

## [GET] 举报记录列表

- 接口路径: GET /admin/video/report/list
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 获取用户举报记录列表（需管理员权限）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| type | query | string | 是 | 举报类型 可选: video/danmu |
| status | query | integer | 否 | 处理状态（1待处理 2已处理 3已驳回） 可选: 1/2/3 |
| page | query | integer | 否 | 页码 |
| pageSize | query | integer | 否 | 每页数量 |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | - |
| data.list | array<oneOf(AdminVideoReportItem \| AdminDanmuReportItem)> | - |
| data.list[].id | integer(uint) | 举报ID |
| data.list[].reporterUsername | string | 举报人用户名 |
| data.list[].videoId | integer(uint) | 视频ID |
| data.list[].videoTitle | string | 视频标题 |
| data.list[].videoCover | string | 视频封面 |
| data.list[].reason | string | 举报原因 |
| data.list[].detail | string | 举报详情 |
| data.list[].imageUrls | array<string> | 证据图片 |
| data.list[].status | integer | 处理状态 |
| data.list[].handleNote | string | 处理说明 |
| data.list[].handledBy | integer(uint) | 处理人ID |
| data.list[].handledAt | string(date-time) | 处理时间 |
| data.list[].createdAt | string(date-time) | 举报时间 |

响应示例:

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 9101,
        "reporterUsername": "alice",
        "videoId": 2001,
        "videoTitle": "示例标题",
        "videoCover": "https://cdn.example.com/cover/2001.jpg",
        "reason": "示例原因",
        "detail": "处理完成",
        "imageUrls": ["https://example.com/page"],
        "status": 1,
        "handleNote": "处理完成",
        "handledBy": 9101,
        "handledAt": "2024-06-01T12:00:00Z",
        "createdAt": "2024-06-01T12:00:00Z"
      }
    ],
    "total": 1
  },
  "msg": "获取成功"
}
```

## [PUT] 处理举报记录

- 接口路径: PUT /admin/video/report/handle
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 管理员处理视频/弹幕举报（需管理员权限）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| type | body | string | 是 | 举报类型 |
| reportIds | body | array<integer> | 是 | 举报记录ID列表 |
| status | body | integer | 是 | 处理状态（2已处理 3已驳回） |
| handleNote | body | string | 否 | 处理说明（可选） |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | - |
| data.handled | integer(int64) | 实际处理数量 |

响应示例:

```json
{
  "code": 0,
  "data": {
    "handled": 1
  },
  "msg": "处理成功"
}
```

## [GET] 视频列表（管理）

- 接口路径: GET /admin/video/list
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 获取视频列表（需管理员权限）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| userId | query | integer | 否 | 作者用户ID（可选） |
| keyword | query | string | 否 | 标题/描述关键词（可选） |
| status | query | integer | 否 | 视频状态（1已发布 2私密 3已删除 4审核中） 可选: 1/2/3/4 |
| partitionId | query | integer | 否 | 分区ID（可选） |
| sort | query | string | 否 | 排序（latest最新 oldest最早 views播放量 likes点赞） 可选: latest/oldest/views/likes |
| page | query | integer | 否 | 页码 |
| pageSize | query | integer | 否 | 每页数量 |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | - |
| data.list | array<AdminVideoItem> | - |
| data.list[].id | integer(uint) | 视频ID |
| data.list[].title | string | 标题 |
| data.list[].cover | string | 封面 |
| data.list[].duration | integer | 时长（秒） |
| data.list[].views | integer(int64) | 播放数 |
| data.list[].likes | integer(int64) | 点赞数 |
| data.list[].commentCount | integer(int64) | 评论数 |
| data.list[].coinCount | integer(int64) | 投币数 |
| data.list[].favoriteCount | integer(int64) | 收藏数 |
| data.list[].danmuCount | integer(int64) | 弹幕数 |
| data.list[].isOriginal | boolean | 是否原创 |
| data.list[].storageType | string | 存储类型 |
| data.list[].status | integer | 视频状态 |
| data.list[].partitionId | integer(uint) | 分区ID |
| data.list[].partitionName | string | 分区名称 |
| data.list[].author | AdminVideoAuthor | - |
| data.list[].author.id | integer(uint) | 用户ID |
| data.list[].author.username | string | 用户名 |
| data.list[].author.avatar | string | 头像URL |
| data.list[].createdAt | string(date-time) | 创建时间 |

响应示例:

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 2001,
        "title": "示例标题",
        "cover": "https://cdn.example.com/cover/2001.jpg",
        "duration": 60,
        "views": 1,
        "likes": 1,
        "commentCount": 1,
        "coinCount": 1,
        "favoriteCount": 1,
        "danmuCount": 1,
        "isOriginal": true,
        "storageType": "pwd",
        "status": 1,
        "partitionId": 2001,
        "partitionName": "示例名称",
        "author": {
          "id": 1001,
          "username": "alice",
          "avatar": "https://cdn.example.com/avatar/1001.png"
        },
        "createdAt": "2024-06-01T12:00:00Z"
      }
    ],
    "total": 1
  },
  "msg": "获取成功"
}
```

## [GET] 视频详情（管理）

- 接口路径: GET /admin/video/detail
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 管理员获取视频详情（包含资源与分P信息）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| videoId | query | integer | 是 | 视频ID |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | 视频详情（同用户视频详情返回的 VideoItem，不含 watchProgress） |

响应示例:

```json
{
  "code": 0,
  "data": {
    "id": 2001,
    "title": "示例标题",
    "description": "示例说明",
    "cover": "https://cdn.example.com/cover/2001.jpg",
    "author": {
      "id": 1001,
      "username": "alice",
      "avatar": "https://cdn.example.com/avatar/1001.png",
      "level": 3,
      "description": "示例说明"
    },
    "duration": 60,
    "views": 1,
    "likes": 1,
    "commentCount": 1,
    "coinCount": 1,
    "favoriteCount": 1,
    "danmuCount": 1,
    "isOriginal": true,
    "storageType": "pwd",
    "status": 1,
    "createdAt": "2024-06-01T12:00:00Z",
    "resources": [],
    "parts": []
  },
  "msg": "获取成功"
}
```

## [DELETE] 删除视频（管理）

- 接口路径: DELETE /admin/video/delete
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 管理员删除视频（可选软删或物理删除）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| videoIds | body | array<integer> | 是 | 视频ID列表 |
| hardDelete | body | boolean | 否 | 是否物理删除（默认 false） |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | 响应数据 |

响应示例:

```json
{
  "code": 0,
  "data": {},
  "msg": "删除成功"
}
```

## [PUT] 恢复上架视频

- 接口路径: PUT /admin/video/restore
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 管理员批量恢复已删除视频（软删恢复）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| videoIds | body | array<integer> | 是 | 视频ID列表 |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | - |
| data.restored | integer(int64) | 恢复数量 |

响应示例:

```json
{
  "code": 0,
  "data": {
    "restored": 1
  },
  "msg": "恢复成功"
}
```

## [PUT] 审核视频

- 接口路径: PUT /admin/video/review
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 审核视频（需管理员权限，仅处理审核中视频）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| videoIds | body | array<integer> | 是 | 视频ID列表 |
| status | body | integer | 是 | 审核结果（1通过发布 2转私密 3驳回删除） |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | - |
| data.updated | integer(int64) | 更新数量 |

响应示例:

```json
{
  "code": 0,
  "data": {
    "updated": 1
  },
  "msg": "审核成功"
}
```

## [POST] 创建分区

- 接口路径: POST /admin/video/partition
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 创建视频分区（需管理员权限）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| name | body | string | 是 | 分区名称 |
| iconUrl | body | string | 否 | 分区图标URL（可选） |
| sortOrder | body | integer | 否 | 排序顺序（可选） |
| isActive | body | boolean | 否 | 是否启用 |
| isSubmittable | body | boolean | 否 | 是否允许投稿 |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | Partition | - |
| data.id | integer(uint) | 分区ID |
| data.name | string | 分区名称 |
| data.iconUrl | string | 分区图标URL |
| data.sortOrder | integer | 排序顺序 |
| data.isActive | boolean | 是否启用 |
| data.isSubmittable | boolean | 是否允许投稿 |

响应示例:

```json
{
  "code": 0,
  "data": {
    "id": 2,
    "name": "示例名称",
    "iconUrl": "https://example.com/page",
    "sortOrder": 1,
    "isActive": true,
    "isSubmittable": true
  },
  "msg": "创建成功"
}
```

## [PUT] 更新分区

- 接口路径: PUT /admin/video/partition
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 更新视频分区（需管理员权限）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| id | body | integer | 是 | 分区ID |
| name | body | string | 是 | 分区名称 |
| iconUrl | body | string | 否 | 分区图标URL（可选） |
| sortOrder | body | integer | 否 | 排序顺序（可选） |
| isActive | body | boolean | 否 | 是否启用 |
| isSubmittable | body | boolean | 否 | 是否允许投稿 |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | 响应数据 |

响应示例:

```json
{
  "code": 0,
  "data": {},
  "msg": "更新成功"
}
```

## [DELETE] 删除分区

- 接口路径: DELETE /admin/video/partition
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 删除视频分区（需管理员权限）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| id | body | integer | 是 | 分区ID |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | 响应数据 |

响应示例:

```json
{
  "code": 0,
  "data": {},
  "msg": "删除成功"
}
```

## [GET] 分区列表（管理）

- 接口路径: GET /admin/video/partitions
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 获取所有分区列表（需管理员权限）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:
| 名称 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| page | query | integer | 否 | 页码 |
| pageSize | query | integer | 否 | 每页数量 |

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | object | - |
| data.list | array<Partition> | - |
| data.list[].id | integer(uint) | 分区ID |
| data.list[].name | string | 分区名称 |
| data.list[].iconUrl | string | 分区图标URL |
| data.list[].sortOrder | integer | 排序顺序 |
| data.list[].isActive | boolean | 是否启用 |
| data.list[].isSubmittable | boolean | 是否允许投稿 |

响应示例:

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 2,
        "name": "示例名称",
        "iconUrl": "https://example.com/page",
        "sortOrder": 1,
        "isActive": true,
        "isSubmittable": true
      }
    ],
    "total": 1
  },
  "msg": "获取成功"
}
```
