# 原生数据库迁移

## 模块职责

001_core.sql建立运行与队列表；002_vector.sql建立向量扩展表。官方LangGraph检查点表由migrate:graph单独管理，禁止相互替代。

## 运行与验收

从项目根目录执行：`npm run migrate -- --vector；npm run migrate:graph`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
