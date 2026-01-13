# 后台-站点管理

分类说明：站点统计与配置管理

Base URL：/v1

## [GET] 站点统计

- 接口路径: GET /admin/site/stats
- 认证: 需要登录（客户端全局自动携带 Token）
- 权限: 需要RBAC权限
- 依赖接口: 无
- 接口说明: 管理后台站点统计（需管理员权限）
- HTTP 状态码: 200（业务码 code 判断成功/失败）
- 响应结构: code=0 成功，code=1 失败；msg 为提示信息

请求参数:

- 无

响应字段:
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| data | AdminSiteStats | - |
| data.overview | object | - |
| data.overview.totalUsers | integer(int64) | - |
| data.overview.onlineUsers | integer(int64) | - |
| data.overview.totalVideos | integer(int64) | - |
| data.overview.totalComments | integer(int64) | - |
| data.overview.todayLoginUsers | integer(int64) | - |
| data.overview.todayRegisters | integer(int64) | - |
| data.daily | object | - |
| data.daily.visitUsers | TrendSeries | - |
| data.daily.visitUsers.x | array<string> | - |
| data.daily.visitUsers.values | array<integer(int64)> | - |
| data.daily.visitUsers.rates | array<number(float)> | - |
| data.daily.publishVideos | TrendSeries | - |
| data.daily.publishVideos.x | array<string> | - |
| data.daily.publishVideos.values | array<integer(int64)> | - |
| data.daily.publishVideos.rates | array<number(float)> | - |
| data.daily.newUsers | TrendSeries | - |
| data.daily.newUsers.x | array<string> | - |
| data.daily.newUsers.values | array<integer(int64)> | - |
| data.daily.newUsers.rates | array<number(float)> | - |
| data.monthly | object | - |
| data.monthly.newVideos | TrendSeries | - |
| data.monthly.newVideos.x | array<string> | - |
| data.monthly.newVideos.values | array<integer(int64)> | - |
| data.monthly.newVideos.rates | array<number(float)> | - |

响应示例:

```json
{
  "code": 0,
  "data": {
    "overview": {
      "totalUsers": 1,
      "onlineUsers": 1,
      "totalVideos": 1,
      "totalComments": 1,
      "todayLoginUsers": 1,
      "todayRegisters": 1
    },
    "daily": {
      "visitUsers": {
        "x": ["2024-06-01"],
        "values": [1],
        "rates": [0.5]
      },
      "publishVideos": {
        "x": ["2024-06-01"],
        "values": [2001],
        "rates": [0.5]
      },
      "newUsers": {
        "x": ["2024-06-01"],
        "values": [1],
        "rates": [0.5]
      }
    },
    "monthly": {
      "newVideos": {
        "x": ["2024-06-01"],
        "values": [2001],
        "rates": [0.5]
      }
    }
  },
  "msg": "获取成功"
}
```
