# API契约测试

## 模块职责

api.test.ts验证令牌拒绝；host.test.ts（若存在）验证框架宿主生命周期。完整真实HTTP与浏览器流程由scripts/experience-smoke.mjs及browser-smoke.mjs完成。

## 运行与验收

从项目根目录执行：`npm run test:api`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
