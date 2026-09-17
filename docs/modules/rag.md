# 证据检索

## 职责与入口

源码：`src/core/rag.ts`。

EvidenceIndex 使用本地关键词检索、切块与租户过滤，返回文档标识、标题、文本和来源；图中使用这些定位信息生成引用。

## 体验与验收

输入「MCP 工具」观察 search_documents；修改 data/knowledge.json 后重启再查。不得删除租户隔离字段。

## 限制与扩展约束

这不是向量检索。pgvector 的独立适配在 src/infra/postgres.ts，默认图未自动嵌入向量链路。引入向量前需固定 embedding 模型、维度与测试。

涉及外部依赖的测试结果见 [验证记录](../../VALIDATION.md)。模块清单见 [模块索引](../MODULES.md)。
