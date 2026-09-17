# 检查点与恢复

## 职责与入口

源码：`integrations/langchain/suite.ts`。

默认 MemorySaver，显式切换 PostgresSaver。checkpoint 命名与 thread_id 留在框架中，HTTP 只读暴露检查点历史。

## 体验与验收

设 CHECKPOINT_MODE=postgres 并迁移，运行到审批后重启 API，再打开任务批准。test:postgres 自动验证 close/reopen 的暂停恢复。

## 限制与扩展约束

重启文件记录还在而内存 checkpoint 不在时明确报错。当前只有只读历史与继续执行，没有任意修改状态、分叉或时间旅行按钮。

涉及外部依赖的测试结果见 [验证记录](../../VALIDATION.md)。模块清单见 [模块索引](../MODULES.md)。
