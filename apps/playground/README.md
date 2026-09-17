# 免依赖教学网页

## 模块职责

main.ts 直接使用Node HTTP与原生执行器，监听loopback并要求本地随机令牌。用于ZIP下载后的离线机制验证；并不声称加载NestJS/LangChain/Nuxt。

## 运行与验收

从项目根目录执行：`npm run demo`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
