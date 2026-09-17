# LangChain / LangGraph集成

## 模块职责

model:框架模型替身与live；tools:5个Zod工具；agent:循环与中间件；research:研究状态图；suite:检查点装配；host:线程/运行/事件/审批/恢复；migrate:PostgresSaver.setup；demo:CLI。

## 运行与验收

从项目根目录执行：`npm run test:framework；npm run demo:agent`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
