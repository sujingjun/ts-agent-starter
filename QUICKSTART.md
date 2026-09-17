# 快速开始

## 1. 主体验台

Node.js 22.16+，npm；所有命令从项目根目录执行。首次联网安装：

```bash
npm run setup
npm run dev
```

访问 `http://127.0.0.1:3000`，输入终端打印的本地令牌，点击连接。API 是 `http://127.0.0.1:3001`。令牌只保存在网页内存，刷新后重新填写；浏览器不接触模型密钥。

手动分步等价命令：

```bash
npm install
node scripts/init-env.mjs
npm run build
npm run api
# 另一个终端
npm run web
```

`init-env` 不覆盖已存在的 `.env`。已有旧版 `.env` 时，对照 `.env.example` 增补新配置，特别是 `CHECKPOINT_MODE` 与 `WEB_ORIGIN`。

## 2. 无密钥验证顺序

先执行计算 `(2+3)*4`，预期结果包含 20。继续同一对话询问上一轮问题。随后分别尝试批准笔记、拒绝另一条笔记、读取笔记；最后执行研究并查看审批与产物。完整逐项验收见 [能力清单](docs/CAPABILITIES.md)。

```bash
npm run test:system
npm run build:web
npm run test:mcp
# 保持 API / 网页运行，再执行
npm run test:experience
npx playwright install chromium
node --env-file=.env scripts/browser-smoke.mjs
```

规则演示模型只验证执行机制，不用于测量模型准确率。研究资料默认来自 `data/knowledge.json`，不是实时互联网搜索。

## 3. CLI

```bash
npm run demo:agent -- '计算 (2+3)*4'
npm run demo:graph -- 'MCP 工具'
# 显式批准本次 CLI 研究报告写入
npm run demo:graph -- 'MCP 工具' --approve
# 原生执行器教学对照
npm run cli -- ask '计算 2+3'
```

没有安装依赖但使用含 `dist-core` 的 ZIP 时，执行 `npm run demo` 或 `npm run test:offline`。不要把离线原生测试的结果归到 LangChain 集成。

## 4. 真实模型

修改 `.env`，随后重启 API：

```dotenv
MODEL_MODE=live
LLM_BASE_URL=https://你的模型服务地址/v1
LLM_MODEL=你的实际模型标识
LLM_API_KEY=你的服务端密钥
```

这里只对兼容 Chat Completions 的模型提供默认适配。所选模型必须实际支持工具调用；研究报告还会用结构化响应工具。仅宣称接口兼容不足以证明这些能力均可用。`LLM_BASE_URL` 应使用 HTTPS；仅本地测试服务可同时设 `ALLOW_LOCAL_MODEL=true` 并使用 loopback HTTP。

`LLM_STREAM` 是原生执行器开关；框架的 `ChatOpenAI` 默认流式。费用归所配置的模型提供商。模板未附密钥、未把 ChatGPT 订阅作为 API 额度。

## 5. PostgreSQL 检查点与原生存储

先在 `.env` 添加 `POSTGRES_PASSWORD`（建议随机十六进制串，不含 URL 特殊字符），然后：

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d postgres
```

修改 `.env`：

```dotenv
DATABASE_URL=postgresql://agents:与POSTGRES_PASSWORD一致的密码@127.0.0.1:5432/agents
STORE_MODE=postgres
CHECKPOINT_MODE=postgres
EXECUTION_MODE=inline
```

再执行：

```bash
npm run migrate -- --vector
npm run migrate:graph
npm run dev
```

原生 `agent_runs` 表与 LangGraph 的 checkpoint 表是两套表，由两个命令管理。`migrate:graph` 调用官方 `PostgresSaver.setup()`；应用启动不擅自执行 DDL。只有 `CHECKPOINT_MODE=postgres` 才为 Studio 提供跨 API 重启检查点。

## 6. 完整容器体验

```bash
node scripts/init-env.mjs
# 编辑 .env，设置 POSTGRES_PASSWORD；默认 MODEL_MODE=demo 即可
# 首次创建数据库与文件卷，API 使用非 root 用户

docker compose --env-file .env -f infra/docker-compose.yml --profile full up --build
```

首次构建需要 npm 和容器镜像网络；容器版本也不是离线安装包。服务端模型地址使用容器可访问地址，不要误用容器自身的 localhost。

## 7. 故障恢复

浏览器断开只断开查看，不自动取消任务；重新连接并打开运行记录。用户点击取消才发送取消请求。处于审批状态时先批准或拒绝，不能用恢复接口绕过。内存检查点因重启丢失时新建任务，不从 HTTP 记录伪造检查点。

具体失败定位见 [故障排查](docs/TROUBLESHOOTING.md)。
