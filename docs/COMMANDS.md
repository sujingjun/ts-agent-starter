# 命令索引

从根目录执行。`npm run setup` 安装/编译；`npm run dev` 同时启动API与Nuxt；`npm run doctor` 检查配置。所有入口的精确定义以根package.json为准。

| 分类 | 命令 |
|---|---|
| 主应用 | setup、dev、build、api、web、build:web |
| 框架演示 | demo:agent、demo:graph（需显式--approve导出） |
| 原生教学 | demo、cli、research、review |
| 数据库 | migrate、migrate:graph、worker |
| 验收 | test:core、test:offline、eval、test:framework、test:api、test:experience、test:mcp、test:postgres、test:browser |
| 文档/归档 | docs:check、verify |

`check:all` 包括构建与不依赖外部数据库/浏览器的测试，数据库与浏览器由独立步骤启动后验证。setup:api/web/mcp 为向后兼容别名，均改为根安装。
