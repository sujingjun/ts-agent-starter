# Nuxt体验台

## 模块职责

npm workspace。主页面框架体验，/native页面原生对照；nuxt.config.ts定义公开API基址。模型密钥不进入public runtimeConfig。

## 运行与验收

从项目根目录执行：`npm run web；npm run build:web`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
