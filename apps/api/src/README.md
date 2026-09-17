# API模块

## 模块职责

main:启动与安全错误过滤；auth.guard:令牌认证；resources:原生依赖装配；agent.service/controller:原生状态；studio.controller:框架Host、SSE、审批、产物；migrate:显式原生数据库DDL。

## 运行与验收

从项目根目录执行：`npm run test:api && npm run test:experience`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
