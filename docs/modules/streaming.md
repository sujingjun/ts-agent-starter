# 流式事件

## 职责与入口

源码：`apps/api/src/studio.controller.ts`。

StudioHost 从框架 streamEvents v2 归一化模型、工具、节点事件，SSE 用单调 seq 游标补发；UI 用 fetch 流以携带 Authorization。

## 体验与验收

执行计算并查看事件；任务运行中刷新网页，重新连接打开记录。获取结果不依赖前端持续在线。

## 限制与扩展约束

日志只展示可见消息、工具与节点，不要求输出私有思维过程。事件最多3000条；数据库检查点不是这个事件日志。

涉及外部依赖的测试结果见 [验证记录](../../VALIDATION.md)。模块清单见 [模块索引](../MODULES.md)。
