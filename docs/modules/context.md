# 上下文构建

## 职责与入口

源码：`integrations/langchain/agent.ts`。

selectContext 按完整 human 轮次分组裁剪，避免孤立 ToolMessage。保留最近完整轮次，当前轮次超过字节预算时明确报错。

## 体验与验收

连续对话后查看历史，再运行 test:framework 中的长消息裁剪测试。原生 core/context.ts 有独立预算与摘要教学实现。

## 限制与扩展约束

字节上限是消息载荷预算，不等于模型精确 token 上限，也不包含全部工具定义。没有声称自动总结全部历史；永久历史不会被本次裁剪删除。

涉及外部依赖的测试结果见 [验证记录](../../VALIDATION.md)。模块清单见 [模块索引](../MODULES.md)。
