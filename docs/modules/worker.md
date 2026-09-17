# 原生后台队列

## 职责与入口

源码：`apps/worker/main.ts`。

PostgresQueue 领取任务、维护租约并调用原生执行器。API 的 EXECUTION_MODE=worker 仅影响原生 /api/runs。

## 体验与验收

迁移原生表，设置 STORE_MODE=postgres 与 EXECUTION_MODE=worker，分别运行 npm run api 和 npm run worker，再访问 /native 提交任务。

## 限制与扩展约束

Studio 图不会被此 Worker 执行。不要把原生队列租约推广为 LangGraph 分布式执行保证。

涉及外部依赖的测试结果见 [验证记录](../../VALIDATION.md)。模块清单见 [模块索引](../MODULES.md)。
