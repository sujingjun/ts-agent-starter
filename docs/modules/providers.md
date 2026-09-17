# 模型与演示替身

## 职责与入口

源码：`integrations/langchain/model.ts`。

DemoChatModel 实现实际 BaseChatModel；live 通过 ChatOpenAI 使用明确的兼容服务配置。未配置不得静默退回演示。

## 体验与验收

先跑 demo:agent，之后填写真实模型三个配置再重启，用相同输入比对。

## 限制与扩展约束

没有已验证的厂商通用兼容保证。模型需支持工具调用，网络和费用由实际服务决定；日志不打印模型密钥。

涉及外部依赖的测试结果见 [验证记录](../../VALIDATION.md)。模块清单见 [模块索引](../MODULES.md)。
