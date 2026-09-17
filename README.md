# TS Agent Starter

TypeScript 智能体学习与应用模板，基于既有 v0.1.0 增量升级。当前版本 **0.2.0**。

主体验：**Nuxt / Nuxt UI → NestJS / Fastify → LangChain / LangGraph → 工具、笔记、检查点与审批**。保留原生 TS 执行器作为教学对照，不用自研循环冒充框架集成。

## 开始

需要 Node.js 22.16+。在项目根目录执行：

```bash
npm run setup
npm run dev
```

`setup` 安装依赖、生成本地随机访问令牌、编译后端并检查文档。`dev` 等待 API 健康检查通过后启动网页。打开终端显示的 `http://127.0.0.1:3000`，输入终端中的本地访问令牌，点击「连接」。不要把这个开发令牌贴到公开记录中。

默认 `MODEL_MODE=demo`、`CHECKPOINT_MODE=memory`，不需要模型密钥或数据库。**运行的是实际 LangChain / LangGraph；模型是确定性演示替身，不是真实大模型。** 配置失败不会偷偷退回演示模式。

已有 ZIP 中的预编译核心，也可无需安装依赖体验：

```bash
npm run demo
```

该入口是 `http://127.0.0.1:3010` 的原生 TS 教学台，**不是**主框架体验台。GitHub 源码克隆后先构建核心，或使用发布包。

## 体验路径

| 操作 | 实际能力 | 预期 |
|---|---|---|
| 选择计算卡片并执行 | `createAgent`、工具 Schema、流式事件 | 返回 20，出现计算器调用 |
| 勾选继续对话，问「我刚才问了什么」 | 同一 `thread_id` 的会话检查点 | 返回上一轮问题 |
| 选择「记住」 | `humanInTheLoopMiddleware` | 暂停；批准才写笔记，拒绝不写 |
| 选择「读取笔记」 | 租户隔离的文件记忆 | 新运行读取已批准笔记 |
| 选择研究流程 | StateGraph 并行检索、结构化报告、引用校验 | 到达人工审核，未批准前无报告文件 |
| 批准研究报告 | `interrupt` / `Command`、幂等产物写入 | 可下载 JSON 报告 |
| 选择无证据研究 | 明确失败分支 | 不编造报告，不要求无意义审批 |
| 查看检查点历史 | `getStateHistory` | 只读查看节点历史，不暗中重放副作用 |
| 选择技能与上下文示例 | 按需加载、完整轮次裁剪 | 展示实际工具/事件；裁剪须长对话才能触发 |

说明：在内存检查点模式下，API 重启后旧会话不可继续，界面会报出原因。需要跨重启恢复时切换 PostgreSQL，先执行两套独立迁移。数据库中存在运行记录不等于图的检查点存在。

## 文档

从 [快速开始](QUICKSTART.md) → [能力验收清单](docs/CAPABILITIES.md) → [模块索引](docs/MODULES.md) 阅读。

[架构与流程](ARCHITECTURE.md) · [API](docs/API.md) · [测试](docs/TESTING.md) · [部署](docs/DEPLOYMENT.md) · [安全](docs/SECURITY.md) · [当前验证结果](VALIDATION.md)

## 边界

这是**单租户、本地开发、单 API 进程**模板。`LOCAL_TENANT_ID` 由服务端决定，客户端不能传入任意租户。Studio 的并发锁是进程内锁；多副本、生产身份、额度计费和公共服务防护不在本版本完成范围内。

原生 `/api/runs` 和框架 `/api/studio/runs` 有独立状态语义，不能互相续跑。Worker 执行原生队列任务，不执行 Studio 图；Studio 长任务在 API 进程内执行，靠图检查点恢复。

实时搜索、pgvector、MCP、浏览器和 Docker 提供明确入口，但外部环境与凭证仍须配置。**配置项、测试脚本或目录存在，不等于这些外部服务已在你的机器上验收。** 以 `VALIDATION.md` 和实际 CI 日志为准。

## 来源

参考 [LangChain JavaScript 官方文档](https://docs.langchain.com/oss/javascript/langchain/overview) 与 [LangGraph JavaScript 官方文档](https://docs.langchain.com/oss/javascript/langgraph/overview)，2026-09-17 核对。原教学内容来源与许可见 [NOTICE](NOTICE.md)、[LICENSE](LICENSE.md)，不得将包含原教程衍生内容的整包误标成无条件商业 MIT。
