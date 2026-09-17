# 人工审批

## 职责与入口

源码：`integrations/langchain/host.ts`。

普通 Agent 使用 humanInTheLoopMiddleware；研究图使用 interrupt。服务端读取当前 checkpoint 决定需要审批的调用，客户端仅提交 allow 布尔值。

## 体验与验收

触发笔记写入或研究导出，查看完整审批载荷。分别批准、拒绝并核对文件；终态任务重复审批应拒绝。

## 限制与扩展约束

界面批准按钮表示批准当前展示的整个待审批批次，不能静默增加工具。外部副作用必须另外设计幂等和核对协议。

涉及外部依赖的测试结果见 [验证记录](../../VALIDATION.md)。模块清单见 [模块索引](../MODULES.md)。
