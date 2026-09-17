# 公开网页读取

## 模块职责

main.ts 使用Playwright打开显式提供的公开URL，提取正文和截图。独立浏览器程序，不是无限自主浏览Agent，也不会默认登录用户账户。

## 运行与验收

从项目根目录执行：`npx playwright install chromium；npx tsx integrations/browser/main.ts <公开HTTPS地址>`。需要的外部配置见根目录 QUICKSTART.md。

## 维护约束

变更输入输出或持久状态时同步测试与模块说明。失败须能定位到配置、模型、工具或状态，不把未运行集成写成通过。完整目录与专题说明见根目录 docs/MODULES.md。


无需外网的浏览器体验：`npm run demo:browser`。公开页面必须显式设置 `BROWSER_ALLOWED_HOSTS=example.com`，只允许白名单中的HTTPS主机。脚本禁止服务工作者和下载，但域名白名单不等于完整网络隔离。
