# 原生应用示例

## 模块职责

research-agent.ts演示有证据研究；code-review-agent.ts演示Diff审查。框架研究的当前主入口是Nuxt研究卡片或demo:graph，不把原生例子改名冒充图实现。

## 运行与验收

从项目根目录执行：`npm run research；npm run review`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
