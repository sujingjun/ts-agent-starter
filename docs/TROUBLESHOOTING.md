# 故障排查

| 症状 | 检查 | 处理 |
|---|---|---|
| npm域名无法解析 | curl registry / 系统DNS | 修复开发环境网络；不要把旧核心测试当全栈成功 |
| npm版本不存在/peer冲突 | 安装日志与package-lock | 核对真实已发布版本，锁定兼容组合后再构建 |
| API_AUTH_TOKEN错误 | .env是否存在、长度>=32 | node scripts/init-env.mjs仅创建，不覆盖；将令牌填入网页 |
| 页面401 | Authorization、API进程使用的.env | 重新连接，不把令牌放query string |
| 页面跨域错误 | localhost vs 127.0.0.1、WEB_ORIGIN | 两个本地来源均加入逗号分隔白名单 |
| 页面有目录但不能执行 | /health、/api/studio/capabilities | 修复后端；dev脚本不会在后端未就绪时继续 |
| 旧运行存在但无法恢复 | CHECKPOINT_MODE是否memory、是否重启 | 新建任务，或先迁移切换postgres；HTTP文件不代替检查点 |
| PG表不存在 | 原生表与图检查点是两套迁移 | npm run migrate；npm run migrate:graph |
| live启动失败 | 模型URL、模型名、密钥三项 | 显式补齐；不静默降级demo |
| 研究报告引用失败 | sourceIds是否来自证据 | 最多修订一次，仍错返回校验失败 |
| 审批报任务忙 | 同线程上次执行正在释放锁 | 等状态稳定后重试当前记录；不要新造审批参数 |
| MCP无法加载包 | 根目录npm依赖域 | npm install，然后 npm run test:mcp |
| Chromium缺失 | Playwright浏览器未安装 | npx playwright install chromium |
| Docker文件权限错误 | app_data卷、运行用户node | 检查卷权限；不以root运行整个系统兜底 |

未配置Tavily、embedding或浏览器不是模型故障；相应能力不会默认伪装开启。`npm run doctor` 只做配置诊断，不代表真实模型或数据库查询验证。
