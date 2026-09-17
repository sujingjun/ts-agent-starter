# 测试与验证

## 分层运行

| 命令 | 检查对象 | 需要 |
|---|---|---|
| npm run test:core | 原生113项核心断言（数量随代码变化） | TypeScript开发依赖 |
| npm run test:offline | 同一套预编译原生测试 | dist-core、Node |
| npm run eval | 50项固定原生回归 | dist-core；非真实LLM质量 |
| npm run test:framework | 实际 LangChain/LangGraph，模型替身 | 完整npm依赖 |
| npm run test:api | NestJS鉴权/host测试 | 完整npm依赖 |
| npm run test:experience | 正在运行API的HTTP完整链路 | API与.env令牌 |
| npm run test:mcp | SDK client/server发现调用 | MCP依赖 |
| npm run test:postgres | 真Postgres检查点重开恢复 | DATABASE_URL与pgvector镜像 |
| npm run test:browser | 真浏览器点击UI、得到计算结果 | API、Nuxt、Chromium、令牌 |
| npm run docs:check | 所有源码目录README与相对链接 | Node |
| npm run check:all | 核心、框架、API、Nuxt构建、MCP | 完整npm依赖 |

`check:all` 不隐含数据库或浏览器已启动，这两项由 CI 独立阶段执行。真实模型、外部搜索和受限沙箱的验证需要对应环境，不使用静默 skip 冒充成功。

## 失败分层

安装失败：先看 npm 与网络，不调提示词。编译失败：先检查锁文件与官方接口。Schema失败：定位工具参数/响应。图失败：检查当前节点、next、interrupt。事实错误：检查证据与语义，不用“事件数量正常”代替答案质量。

## CI

`.github/workflows/check.yml` 使用 PostgreSQL service，在同一提交上安装依赖、编译、执行契约测试、构建Nuxt、验证MCP，然后启动API与网页做HTTP/浏览器验收。日志作为 artifact 保留；无真实模型密钥时只测试框架机制。

首次导入的 bootstrap 工作流只用于将传输包还原成正常源码并提交，禁止把压缩文本目录当最终源码交付。安装或CI失败应保留日志并修复，不把步骤存在写成通过。
