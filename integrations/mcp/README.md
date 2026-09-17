# MCP标准接入

## 模块职责

server.ts通过官方TypeScript SDK暴露计算器与资料工具；client.ts实际列工具、调用计算器并断言70。stdio示例不等于远程OAuth服务。

## 运行与验收

从项目根目录执行：`npm run test:mcp；npm run mcp:server`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
