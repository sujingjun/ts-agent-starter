# 为什么这样接入 LangChain 和 LangGraph

参考版本入口于 2026-09-17 核对。依赖版本以实际安装后的 package-lock.json 为准，不能只凭 GitHub main 的 package.json 认定 npm 已发布或可兼容。

## LangChain 负责什么

`createAgent` 提供标准模型/工具循环。工具使用 `tool` 和 Zod；模型来自 `BaseChatModel`，默认测试替身也经过同一循环。`createMiddleware` 在调用边界裁剪消息；`humanInTheLoopMiddleware` 中断保存笔记；模型调用与工具次数限制防止无限运行。

不要再在 createAgent 外层套一个手写 while 循环。已有原生 AgentRunner 留在独立入口做教学对照。

## LangGraph 负责什么

`StateGraph` 明确组织计划、并行检索、证据门槛、撰写、审查、有限修订、人工审批与导出。状态字段使用 Annotation；工具循环作为撰写节点内部调用，不把全部业务系统塞进图状态。

`interrupt` 会让节点暂停。恢复时使用同一个 thread_id 和 `Command({resume:...})`。暂停前不能先产生不可重复副作用。研究报告通过批准后单独导出，导出内容寻址。

## 持久性不是“打开开关就完整生产化”

MemorySaver 是进程内。PostgresSaver 需要先 setup，再编译图并提供 checkpointer。图状态可恢复不等于工作进程自动调度，也不等于外部 API 只执行一次。Studio 目前在 API 进程中运行，恢复是显式操作；原生 Worker 仍是独立实现。

## 官方资料

- [LangChain 概览](https://docs.langchain.com/oss/javascript/langchain/overview)
- [Agents](https://docs.langchain.com/oss/javascript/langchain/agents)
- [Middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/overview)
- [Structured output](https://docs.langchain.com/oss/javascript/langchain/structured-output)
- [LangGraph 概览](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
- [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [Memory](https://docs.langchain.com/oss/javascript/langgraph/add-memory)

这些链接是上游参考，不是本站自动生成的能力承诺。源码中的小型演示器不代表官方推荐模型或质量评测。

## 类型兼容边界

原生核心的 `tsconfig.core.json` 保持 `strict` 与 `exactOptionalPropertyTypes`。实际安装的 LangChain 1.5.11 中间件声明经过 Zod 3/4 兼容层，在 `exactOptionalPropertyTypes: true` 下出现可选属性声明不兼容。框架/NestJS 编译配置仅覆盖此一选项为 `false`，其余严格检查保持开启，并设置 `noEmitOnError: true`；编译失败时不会使用本轮半成品继续当作成功。这个边界不使用 `any` 断言绕过工具、状态和结构化输出契约。升级依赖时应尝试重新启用该选项并运行框架测试。
