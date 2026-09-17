# 完整体验手册

## 首次启动

项目根目录执行 `npm run setup`，再执行 `npm run dev`。网页为本机 3000 端口，API 为 3001 端口。复制启动终端显示的本地访问令牌，粘贴到网页并连接。此令牌不是模型密钥。

`MODEL_MODE=demo` 使用真实 LangChain / LangGraph 加确定性模型替身，不联网、不消耗大模型额度。`CHECKPOINT_MODE=memory` 无需数据库，但不能跨 API 进程重启恢复。

## 按顺序体验

| 步骤 | 操作 | 成功标志 | 失败时检查 |
|---|---|---|---|
| 1 | 工具调用 → 开始执行 | 计算器返回 20，并显示工具事件 | 执行方式应为标准 Agent |
| 2 | 勾选延续当前线程，输入「我刚才问了什么」 | 回答上一轮算式 | 不能跨内存模式进程重启 |
| 3 | 证据检索 | 输出 hits 与来源编号 | 本地资料位于 data |
| 4 | 写入审批 → 拒绝 | 任务结束，不执行笔记写入 | 查看审批事件，拒绝不是删除已有笔记 |
| 5 | 再次写入审批 → 批准 | 具体调用获批并落盘 | 只批准本次参数，不授权全部未来写入 |
| 6 | 长期笔记 | 新运行读取已批准事实 | 与会话记忆独立，按服务端身份隔离 |
| 7 | 研究工作流 | 并行检索后暂停等待审阅 | 来源编号校验不等于语义事实全真 |
| 8 | 批准报告，下载，查看检查点历史 | 下载 JSON，历史含 checkpointId | 未批准不能下载 |
| 9 | 证据不足分支 | outcome=evidence_missing，不生成虚假报告 | 演示用唯一未匹配查询 |
| 10 | 技能加载 | 仅所选技能加入本次上下文 | 技能不能修改权限 |
| 11 | 多轮与上下文 | 标准循环运行 | 短对话不应伪造压缩事件 |
| 12 | 原生核心对照台 | 使用独立原生循环及事件 | 不可与框架线程相互续跑 |

## 外部模块

MCP：`npm run test:mcp`，使用官方 SDK 客户端/服务端做 stdio 往返。

浏览器：先 `npm exec playwright install chromium`，再 `npm run demo:browser`，使用本地 HTML 测试观察、文本提取与截图。`npm run test:browser` 则验证完整 Nuxt 页面，需要 API/网页运行及 `.env` 中的本地访问令牌。两者都不是公网登录或电脑操作。

PostgreSQL：配置独立测试数据库，再 `npm run migrate -- --vector` 和 `npm run migrate:graph`。业务表、向量扩展、LangGraph 检查点分别迁移。`npm run test:postgres` 检验存储、租户过滤、队列、向量查询及重新连接后的审批恢复。测试会执行幂等建表，不应对未经授权的生产库运行。

容器：见 [部署](DEPLOYMENT.md)。固定测试沙箱：先 `docker pull node:22-bookworm-slim`，再 `npm run test:sandbox`，仅挂载新建临时目录，检查非 root、只读工作区和无网络。它验证固定工具，不等于完整 Docker Compose 部署或生产隔离评估。

真实模型：见 [快速开始](../QUICKSTART.md)。显式切换 live，配置模型端点、模型名和服务端密钥；失败不自动降级。不要对 live 运行确定性演示回归。

## 自动验收

`npm run test:experience` 验证 HTTP 全链路；`node --env-file=.env scripts/browser-smoke.mjs` 在浏览器执行上述主要操作；两者都要求本地 API/网页已启动。完整实测状态见根目录 REMOTE-VALIDATION.json，日志见 artifacts/ci。模型质量评测与接口流程验证是不同结论。
