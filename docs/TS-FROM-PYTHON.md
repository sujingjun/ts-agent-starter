# Python 教程到 TypeScript：迁移语义，不做文本替换

| Python 教程写法 | TS 实现 | 迁移时必须保留的语义 |
|---|---|---|
| dict / dataclass / Pydantic | interface + 显式运行期校验 | TS 类型会在运行期消失，外部输入仍须验证 |
| abstract base class | 小型 interface + 构造注入 | 业务不得依赖 SDK 的内部对象 |
| async / asyncio | Promise + AbortSignal | 超时不等于动作撤销；同时考虑取消和资源清理 |
| Python 列表字符串 / literal_eval | JSON.parse + 数组元素与长度检查 | 不使用 eval 或 Function 求值 |
| yield | async iterable 或持久化事件 | 暴露实际步骤，不制造假进度 |
| context manager | try/finally | 客户端连接、浏览器、数据库必须释放 |
| 多进程与训练栈 | 外部训练服务或专门 TS 计算实现 | 不能把调用远端训练命名为本地全 TS 训练 |

## 本包的几个刻意差异

第四章先规划后执行保留顺序与历史依赖，但计划编码改成 JSON。模型行动使用原生工具调用，不解析自由文本 Thought。工具错误返回结构化结果，方便模型区分没找到和失败。运行状态放入外部存储，不把 NestJS 单例字段当成每个用户的会话。

学习训练和注意力时提供 TS 数值实验，只说明机制；它没有训练 Transformer，也没有复刻原教程 GPU、SFT、GRPO 全流程。见迁移表中的 not-port 标记。

## 实验方法

选择一个上游函数，固定输入、工具输出和模型输出，运行 Python 和 TS 两端，比较结构化状态轨迹而非自然语言字符。然后分别测试错误、超时、空结果和取消。只有这些证据齐全，才把对应功能标记为“行为等价验证通过”。当前包还没有这套全量双端差分证据。


## v0.2 集成补充

主体验入口与当前启动命令见 [QUICKSTART](../QUICKSTART.md)；框架职责见 [LangChain / LangGraph](LANGCHAIN-LANGGRAPH.md)，各模块实际可用范围见 [能力清单](CAPABILITIES.md)。原生教学接口仍保留，不能直接代替框架检查点或审批状态。
