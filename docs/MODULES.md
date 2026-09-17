# 模块索引

所有包含TS、Vue、MJS或SQL源码的目录必须有就近README；`npm run docs:check`自动验证。

## 功能专题

- [工具型 Agent](modules/agent.md)
- [研究状态图](modules/research.md)
- [长期笔记](modules/memory.md)
- [证据检索](modules/rag.md)
- [上下文构建](modules/context.md)
- [技能按需加载](modules/skills.md)
- [人工审批](modules/approval.md)
- [检查点与恢复](modules/checkpoints.md)
- [流式事件](modules/streaming.md)
- [模型与演示替身](modules/providers.md)
- [原生后台队列](modules/worker.md)
- [代码工具与沙箱](modules/sandbox.md)

## 源码目录

| 目录 | 内容 |
|---|---|
| [src](../src/README.md) | 运行时组合 |
| [src/core](../src/core/README.md) | 原生教学内核 |
| [src/infra](../src/infra/README.md) | 原生基础设施 |
| [src/features](../src/features/README.md) | 应用功能 |
| [apps/cli](../apps/cli/README.md) | 原生命令行 |
| [apps/playground](../apps/playground/README.md) | 免依赖教学网页 |
| [apps/api](../apps/api/README.md) | NestJS应用 |
| [apps/api/src](../apps/api/src/README.md) | API模块 |
| [apps/api/tests](../apps/api/tests/README.md) | API契约测试 |
| [apps/web](../apps/web/README.md) | Nuxt体验台 |
| [apps/web/app](../apps/web/app/README.md) | 网页入口 |
| [apps/web/app/pages](../apps/web/app/pages/README.md) | 页面模块 |
| [apps/web/app/composables](../apps/web/app/composables/README.md) | 前端请求与流 |
| [apps/worker](../apps/worker/README.md) | 原生Worker |
| [integrations/langchain](../integrations/langchain/README.md) | LangChain / LangGraph集成 |
| [integrations/langchain/tests](../integrations/langchain/tests/README.md) | 框架验证 |
| [integrations/mcp](../integrations/mcp/README.md) | MCP标准接入 |
| [integrations/browser](../integrations/browser/README.md) | 公开网页读取 |
| [examples](../examples/README.md) | 原生应用示例 |
| [evals](../evals/README.md) | 固定回归 |
| [tests](../tests/README.md) | 原生核心测试 |
| [scripts](../scripts/README.md) | 开发与验收脚本 |
| [infra](../infra/README.md) | 部署配置 |
| [infra/migrations](../infra/migrations/README.md) | 原生数据库迁移 |
| [data](../data/README.md) | 演示知识数据 |
| [skills](../skills/README.md) | 技能包 |

## 设计与操作

[框架接入说明](LANGCHAIN-LANGGRAPH.md) · [能力清单](CAPABILITIES.md) · [测试](TESTING.md) · [部署](DEPLOYMENT.md) · [安全](SECURITY.md)
