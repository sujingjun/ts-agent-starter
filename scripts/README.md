# 开发与验收脚本

## 模块职责

setup/dev/doctor负责安装启动；init-env生成随机令牌；experience/browser/postgres验证对应真实系统；check-docs覆盖源码目录README；verify-package核对归档文件；fetch-upstream只为学习核对。

## 运行与验收

从项目根目录执行：`npm run docs:check；npm run doctor`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。
