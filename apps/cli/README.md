# 原生命令行

## 模块职责

main.ts 使用原生createRuntime，支持ask、list、resume、approve。审批绑定具体callId，未知副作用保持人工核对。LangChain CLI 在 integrations/langchain/demo.ts。

## 运行与验收

从项目根目录执行：`npm run cli -- ask "计算 (2+3)*4"`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
