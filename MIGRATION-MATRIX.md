# 迁移对照与未完成项

**结论：本包是部分能力的 TS 重写与教学工程，不是 100% 原项目还原。**

“章节有对应内容”“代码存在”“离线测试通过”“与原版行为等价”是四个不同维度。这里不以目录数量、总代码行数或自编测试通过率计算迁移完成百分比。

## 项目对应

Hello-Agents → TS Agent Landing Lab：16章主题映射与逐章实验。Agent-Learning-Hub → TS Agent Starter：9阶段工程能力映射。Lab 的额外课件不在 Starter 中重复维护；两个项目各自可运行核心。

## Hello-Agents 固定版本：4f7682ceafe573d07cd8a7d0b89908500e83227d

| 原章节 | TS 位置 | 状态 | 重要差异 / 缺口 |
|---|---|---|
| 01 初识智能体 | `src/core/runner.ts`；Lab `labs/chapter01` | 机制重写并离线测试 | 原完整旅行环境与真实网络未复刻 |
| 02 智能体发展史 | `src/core/workflow.ts`；Lab `labs/chapter02` | 概念实验 | 发展史教材未逐段重制 |
| 03 大语言模型基础 | `src/core/learning-math.ts`；Lab `labs/chapter03` | 数值与接口实验 | 完整 Transformer、Hugging Face 本地部署未移植 |
| 04 智能体经典范式构建 | `src/core/strategies.ts`；Lab `labs/chapter04` | 机制重写并离线测试 | 计划编码改用 JSON；未做双端全量差分 |
| 05 基于低代码平台的智能体搭建 | `src/infra/search.ts`；Lab `labs/chapter05` | 接口契约测试 | Coze/Dify/n8n 产品与编辑器未复刻 |
| 06 框架开发实践 | `src/core/workflow.ts`；Lab `labs/chapter06` | 机制实验 | AutoGen/AgentScope/LangGraph 框架未移植 |
| 07 构建你的Agent框架 | `src/core/types.ts`；Lab `labs/chapter07` | 机制重写并离线测试 | 不是 Python HelloAgents 包的全部 API 对等实现 |
| 08 记忆与检索 | `src/core/rag.ts`；Lab `labs/chapter08` | 部分机制实现 | Qdrant/Neo4j/感知记忆/全部检索策略未移植 |
| 09 上下文工程 | `src/core/context.ts`；Lab `labs/chapter09` | 部分机制实现 | 未实现经过语义验证的自动压缩与完整 GSSC |
| 10 智能体通信协议 | `integrations/mcp/server.ts`；Lab `labs/chapter10` | 适配源码未验收 | A2A/ANP/ACP 标准兼容实现未交付 |
| 11 Agentic-RL | `src/core/learning-math.ts`；Lab `labs/chapter11` | 机制实验，非原训练链移植 | 没有完整 LLM SFT/GRPO、GPU 训练、权重与数据流程 |
| 12 智能体性能评估 | `src/core/evaluation.ts`；Lab `labs/chapter12` | 本地评测实现 | 未下载运行 BFCL/GAIA 全集或真实模型裁判 |
| 13 智能旅行助手 | `src/core/simulation.ts`；Lab `labs/chapter13` | 约束机制实验 | 地图、真实天气、原 UI 与多 Agent 完整应用未复刻 |
| 14 自动化深度研究智能体 | `src/core/deep-research.ts`；Lab `labs/chapter14` | 机制重写并离线测试 | 原完整产品交互及真实检索效果未验收 |
| 15 构建赛博小镇 | `src/core/simulation.ts`；Lab `labs/chapter15` | 机制实验，非原游戏移植 | 原游戏引擎、美术、界面和完整社会模拟未复刻 |
| 16 毕业设计 | `examples/research-agent.ts`；Lab `labs/chapter16` | 工程化毕业示例 | 未迁移 Co-creation-projects 全部社区项目 |

## Agent-Learning-Hub 固定版本：dddf777dde6788228136862f270203424a28efbc

| 阶段 | 位置 | 已做 | 边界 |
|---|---|---|
| 0 判断任务边界 | `docs/TS-FROM-PYTHON.md` | 问题拆解与任务成功标准 | 不是自动把所有后端流程都变成 Agent |
| 1 最小循环 | `src/core/runner.ts` | 原生工具、参数校验、步骤/超时/取消 | 真实模型能力另验 |
| 2 工具、RAG、记忆 | `src/core/rag.ts` | 证据检索、显式记忆、文件工具 | 非完整文档解析产品或全部数据库适配 |
| 3 运行时工程 | `src/core/stores.ts` | 检查点、恢复、权限、事件 | 不是 Claude Code/OpenClaw 的完整复刻 |
| 4 受控协作 | `src/core/workflow.ts` | 有边界的顺序协作与反思 | 没有远程多 Agent 调度平台 |
| 5 Skill 与协议 | `src/core/skills.ts` | 元数据发现与按需正文；MCP 适配源码 | 无插件市场/标准 A2A/ACP/ANP |
| 6 浏览器与计算机 | `integrations/browser/main.ts` | Playwright 受限读取及截图源代码 | 未做通用电脑操作和环境实测 |
| 7 评测、观察、安全 | `src/core/evaluation.ts` | 离线回归、事件与执行边界 | 不提供安全认证或真实任务成功率 |
| 8 真实发布 | `apps/api/src/main.ts` | API/Worker/Web/迁移/CI 源代码 | 依赖与部署未完成集成验收 |

## 原始内容与授权

没有在压缩包里包含完整原仓库、全部原始代码、美术、模型或训练数据。`scripts/fetch-upstream.mjs` 可在你的联网环境取回固定提交作为只读对照；取回原文不是完成 TS 迁移。仓库 README 列出的外部项目和论文不是两个仓库自有的待移植源码。

## 达到严格还原还缺什么

建立原文件/类/函数清单和许可边界；提供 Python 与 TS 的同输入工具夹具；比较每个公共 API 的成功与异常结果、状态轨迹、持久化、并发与恢复语义；迁移完整训练、地图/游戏、三方服务适配和社区项目；完成真实环境验收。在这些证据生成前保持 `fullBehaviorParityVerified:false`。

## 已知偏离上一轮技术建议

Node test 取代 Vitest；核心严格 Schema 子集取代 Zod 默认实现；使用原生 fetch 兼容模型接口；PostgreSQL 队列取代 BullMQ；根目录及子应用独立 npm 包而非 pnpm workspace；未接 LangGraph。不是“无差异替换”，均在架构文档说明。
