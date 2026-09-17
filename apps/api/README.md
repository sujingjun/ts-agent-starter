# NestJS应用

## 模块职责

单根npm依赖域；src/main.ts启动Fastify与两个Controller。src/studio.controller.ts是框架主路径，src/agent.controller.ts保留原生路径。Dockerfile为应用容器，不自动迁移表。

## 运行与验收

从项目根目录执行：`npm run build:api && npm run api`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
