# 原生基础设施

## 模块职责

postgres.ts 提供运行存储、租约队列和向量接口；file-tools.ts限制工作目录；search.ts连接Tavily；sandbox.ts封装受限Docker测试。默认框架主Agent不自动使用这些外部权限。

## 运行与验收

从项目根目录执行：`npm run test:postgres；外部搜索/沙箱需实际凭证与容器`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
