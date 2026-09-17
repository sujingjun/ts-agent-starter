# 原生核心测试

## 模块职责

core/runner/providers/infra/learning/features按职责拆分，覆盖Schema、权限、恢复、边界、工具、文件/租户与教学算法；support为模型与时间测试辅助。

## 运行与验收

从项目根目录执行：`npm run test:core`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
