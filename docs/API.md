# API

除 GET /health 外均需要 `Authorization: Bearer <API_AUTH_TOKEN>`，且令牌至少32字符。默认一个服务端配置租户。请求中不接受自选 tenantId。

## 主体验 `/api/studio`

| 方法/路径 | 输入 | 用途 |
|---|---|---|
| GET /capabilities | 无 | 模式、体验卡片、技能、限制 |
| GET /runs | 无 | 最近运行列表 |
| POST /runs | engine:agent/research, prompt；可选previousRunId、skill | 新建执行 |
| GET /runs/:id | 无 | 状态、可见事件、结果、interrupts |
| GET /runs/:id/events?after=0 | seq游标 | SSE增量事件 |
| POST /runs/:id/approve | allow:boolean | 批准/拒绝当前待审批批次 |
| POST /runs/:id/cancel | 无 | 显式取消 |
| POST /runs/:id/resume | 无 | 从可用图检查点继续，不能绕过审批 |
| GET /runs/:id/history | 无 | 只读检查点历史 |
| GET /runs/:id/artifact | 无 | 下载已批准保存的JSON报告 |

GET请求无body；JSON写请求用 Content-Type:application/json。参数全部经过运行时验证。SSE通过fetch读流而不是把令牌放入URL。线程续用仅允许已完成的普通Agent，不把研究图当聊天历史。

## 原生 `/api`

保留 `/capabilities`、`/runs`、`/runs/:id`、`/runs/:id/events`、`/approve`、`/cancel`、`/resume`、`/reconcile` 等原路径，页面入口 `/native`。原生审批输入是 `{callId,allow}`，不是 Studio 的 `{allow}`。

原生 reconcile 显式提供工具结果或确认未执行；它不能恢复 LangGraph 图，也不能将第三方副作用的未知状态自动判为成功。

## 生命周期

`queued → running → completed/failed/cancelled`。需要人工输入则 `running → waiting_approval → running`。原生额外有 `reconciliation_required`。浏览器刷新不等于取消。框架的节点/工具事件用于诊断而非透露模型私有思维链。
