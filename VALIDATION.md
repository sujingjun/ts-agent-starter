# v0.2.0 验证记录

## 已完成的实际集成验收

GitHub Actions 运行 [35213100935](https://github.com/sujingjun/ts-agent-starter/actions/runs/35213100935) 已成功，验收源码提交 `80ce2ae417d59c3f23246bba35b65ce9bd09a085`，Node.js 22.23.2。核心在本地 Node.js 22.16.0 也通过复跑。

| 项目 | 实测结果 |
|---|---|
| npm 真实依赖安装 | 通过，依赖锁文件已提交 |
| 原生 TypeScript 严格编译与测试 | 113/113，0 跳过 |
| LangChain / LangGraph 实际框架测试 | 7/7，0 跳过 |
| API 运行管理与隔离测试 | 4/4，0 跳过 |
| 确定性离线回归 | 50/50；不是模型质量准确率 |
| NestJS 编译 | 通过，noEmitOnError 开启 |
| Nuxt 生产构建与前端类型检查 | 均通过 |
| 模块 Markdown、相对链接和运行命令 | 通过 |
| MCP 官方 SDK stdio 往返 | 通过 |
| PostgreSQL、队列、租户与 LangGraph 恢复 | 通过，关闭并重新建立数据库连接后恢复审批 |
| API 与网页真实启动 | 通过 |
| HTTP 体验 | 10 项断言通过 |
| Chromium 浏览器体验 | 12 条主要流程通过，0 页面异常 |

最新逐项结果以根目录 `REMOTE-VALIDATION.json` 中的 `sourceCommit`、`workflowRun` 和 `statuses` 为准。`artifacts/ci/` 保存真实日志；旧版本验证记录不能替代新版本。新增加的独立浏览器工具与 Docker 沙箱测试会在对应 CI 项 `browser-tool`、`sandbox` 中报告状态，不以脚本存在推定通过。

## 结论的适用范围

框架是真实的已安装 LangChain/LangGraph，模型是 DemoChatModel 确定性测试替身。真实模型、Tavily、真实 embedding 与 LangSmith 云端没有凭证验收，不标记通过。pgvector 测试使用固定向量，不证明真实 embedding 检索质量。

PostgreSQL 测试证明检查点可由新连接读取并恢复，不等于在云生产环境验证整个进程崩溃、网络分区和多副本接管。完整 Docker Compose 镜像组合未运行；固定沙箱测试与完整应用部署是不同项目。

当前模板面向本地单实例开发体验。生产鉴权、多副本调度、配额、安全留存和外部写操作幂等仍需场景化建设。严格范围见 `docs/SECURITY.md`、`docs/DEPLOYMENT.md`。
