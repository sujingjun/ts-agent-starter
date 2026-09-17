# 开发与验收脚本

## 模块职责

setup/dev/doctor负责安装启动；init-env生成随机令牌；experience/browser/postgres验证对应真实系统；check-docs覆盖源码目录README；verify-package核对归档文件；fetch-upstream只为学习核对。

## 运行与验收

从项目根目录执行：`npm run docs:check；npm run doctor`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。

## 固定浏览器与容器样例

`npm run demo:browser` 在 Chromium 打开本地固定 HTML。`npm run test:browser` 从 `.env` 读取访问令牌并点击主网页的 12 条验收路径。`npm run test:sandbox` 只把新建临时测试目录挂进固定 Docker 镜像；需提前拉取 `node:22-bookworm-slim`，不挂载用户代码或注入凭证。
