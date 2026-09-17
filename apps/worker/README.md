# 原生Worker

## 模块职责

main.ts领取PostgresQueue任务、续租并运行AgentRunner；lease丢失时取消继续执行。只处理原生任务，不消费LangGraph Studio。

## 运行与验收

从项目根目录执行：`npm run worker（需postgres配置与原生迁移）`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
