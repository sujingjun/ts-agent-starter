# 能力配置与人工验收表

「已实现」描述源码范围；实际运行通过与否由测试日志证明。以下默认都使用本地单租户，不能推定为多租户 SaaS 验收。

| 能力 | 入口 | 最小配置 | 验收信号 |
|---|---|---|---|
| LangChain 工具循环 | 主页面 agent | demo、内存 checkpoint | 计算20，观察真实工具事件 |
| 同线程短期记忆 | 主页面继续对话 | 同一 API 实例 | 上一轮问题可回忆 |
| 结构化输出 | research 图 writer | demo 或支持工具的模型 | Zod ReportSchema 通过 |
| 并行分支与合并 | research 图 | 本地资料 | documents/notes 节点都完成后撰写 |
| 有限修订 | research 图 review | 注入无效编号的测试 | 最多修订一次，仍错则明确失败 |
| 人工审批 | 记住 / 研究报告 | 默认开启 | 批准前文件不存在 |
| 跨会话笔记 | read_notes | 文件存储 | 新运行读取明确保存内容 |
| 无证据出口 | 无证据卡片 | 默认 | outcome=evidence_missing |
| 流式事件与补发 | events SSE | 有令牌 | seq递增，无重复展示 |
| 取消/恢复 | 运行页按钮 | 任务非终态；checkpoint存在 | 不绕过审批，不重复导出 |
| 检查点历史 | 运行页历史按钮 | 当前 thread | 返回多条节点快照 |
| 跨进程重启恢复 | PostgresSaver | 数据库 + migrate:graph | 关闭 saver、重开后批准 |
| 原生执行器对照 | /native、CLI | 默认 | 原生状态与测试通过 |
| 原生 Worker | /native | postgres + worker进程 | 队列领取、租约、完成 |
| 本地检索 | search_documents | data/knowledge.json | 引用ID回到实际文档 |
| pgvector 适配 | PgVectorStore | pgvector、真实embedding | 维度固定、租户过滤；默认Agent未连接 |
| 技能按需加载 | 选择技能/load_skill | skills目录 | 正文只在使用时加载 |
| MCP server/client | npm run test:mcp | 官方SDK依赖 | 发现并执行 calculator，断言70 |
| 浏览器读取 | integrations/browser/main.ts | Playwright/Chromium | 公开页面提取与截图 |
| Nuxt 浏览器闭环 | test:browser | API+UI+Chromium | 输入令牌、执行、显示20 |
| 实时搜索 | 原生 tavily_search 工具 | TAVILY_API_KEY + live | 引用实际搜索返回值 |
| 沙箱代码测试 | 原生 sandboxTestTool | Docker、显式工作目录 | 受限容器内测试返回诊断 |
| 教学规划/反思/训练数值/小镇 | src/core 相关模块 | native测试 | 教学断言通过，不冒充模型训练/图形游戏 |

## 本版本有意保留的隔离

框架主线提供5个安全本地工具：计算、文档搜索、保存笔记、读取笔记、加载技能。外部搜索、代码执行、向量库适配保留在原生扩展，不自动注入新 Agent。这样可以在统一仓库体验各模块，但并非声称一个聊天入口自动拥有全部权限。

## 手工验收记录模板

每次验证记录：Git提交、Node/npm版本、模型模式、检查点模式、命令、退出码、输入、期望、实际、日志位置。真实 LLM 任务额外记录模型标识、响应延迟、工具成功率和费用来源；演示替身不产出「准确率提升」结论。
