# 前端请求与流

## 模块职责

useStudio统一框架请求、SSE增量、序号去重、状态刷新和产物下载；useAgent保留原生接口。访问令牌只在内存，不写localStorage或URL。

## 运行与验收

从项目根目录执行：`npm run build:web && npm run test:browser`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
