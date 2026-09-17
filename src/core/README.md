# 原生教学内核

## 模块职责

runner.ts:创建/执行/审批/取消/结果核对；types.ts:持久状态与事件；tools/schema:工具契约；providers:demo/live；stores:内存/文件；context/memory/rag:上下文与证据；strategies/workflow/deep-research:有限规划与研究教学；learning-math/simulation:数值和小镇教学；evaluation:固定回归。原生内核不是LangChain别名。

## 运行与验收

从项目根目录执行：`npm run test:core && npm run eval`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
