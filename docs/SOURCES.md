# 资料来源与版本

资料核对日期：2026-09-17。上游提交是获取时的快照；实现与教学说明为本次迁移重写，不是上游官方 TS 版本。

- Hello-Agents：https://github.com/datawhalechina/hello-agents/tree/4f7682ceafe573d07cd8a7d0b89908500e83227d
- Agent-Learning-Hub：https://github.com/datawhalechina/Agent-Learning-Hub/tree/dddf777dde6788228136862f270203424a28efbc
- 原第四章计划执行源码：https://github.com/datawhalechina/hello-agents/blob/4f7682ceafe573d07cd8a7d0b89908500e83227d/code/chapter4/Plan_and_solve.py
- NestJS：https://docs.nestjs.com/first-steps
- Nuxt：https://nuxt.com/docs/4.x/getting-started/introduction
- MCP TypeScript v2：https://ts.sdk.modelcontextprotocol.io/v2/
- MCP 迁移说明：https://ts.sdk.modelcontextprotocol.io/v2/migration
- Tavily API：https://docs.tavily.com/documentation/api-reference/introduction
- LangGraph 的持久化原理参考（本包未集成）：https://docs.langchain.com/oss/javascript/langgraph/durable-execution

外部文档可能持续更新；实际依赖版本必须通过各项目的锁文件固定。链接存在不表示本次已运行所有官方示例。


## v0.2 集成补充

主体验入口与当前启动命令见 [QUICKSTART](../QUICKSTART.md)；框架职责见 [LangChain / LangGraph](LANGCHAIN-LANGGRAPH.md)，各模块实际可用范围见 [能力清单](CAPABILITIES.md)。原生教学接口仍保留，不能直接代替框架检查点或审批状态。
