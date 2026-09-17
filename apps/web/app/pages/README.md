# 页面模块

## 模块职责

index.vue 提供连接、体验卡片、任务、事件、输出、审批、历史与产物；native.vue保留原生工具执行。模板中的外部文本以普通文本显示，不执行模型输出HTML。

## 运行与验收

从项目根目录执行：`node --env-file=.env scripts/browser-smoke.mjs`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
