# 从一个函数变成可控制的工具

工具的业务逻辑和它的调用权限是两件事。模型只能提出调用；参数、工具是否存在、作用域、权限和执行预算均由代码校验。

## 最小工具

```ts
import type { ToolDefinition } from '../src/core/types.js';
export const countCharacters: ToolDefinition = {
  name: 'count_characters', description: '统计给定文本的 Unicode 码点数量',
  inputSchema: { type: 'object', properties: { text: { type: 'string', maxLength: 2000 } }, required: ['text'], additionalProperties: false },
  outputSchema: { type: 'object', properties: { count: { type: 'integer', minimum: 0 } }, required: ['count'], additionalProperties: false },
  effect: 'read', idempotent: true, timeoutMs: 1000,
  async execute(input, context) {
    context.signal.throwIfAborted();
    return { count: [...String(input['text'])].length };
  },
};
```

路径按你放置文件的位置调整。将工具注册进应用的 ToolRegistry，而不是改 AgentRunner。增加非法参数、长度越界、正确输出、取消和禁止额外参数的测试。

## Schema 的真实边界

核心支持 type、properties、required、additionalProperties、items、enum、数值/长度/数量范围。未知关键词主动报错。它**不支持**完整 JSON Schema、$ref、oneOf、Zod transform 或自定义 refinements。复杂业务约束应放在适配器/业务函数，再以受支持的工具契约暴露；不能静默忽略约束。

## 错误与诊断

未找到数据返回合法空结果；参数失败、权限拒绝、服务不可用要用不同错误码。工具结果超过限制时返回证据定位和摘要，别把整份日志硬塞进模型。当前 Trace 不记录模型隐式推理，也不需要它来诊断可观察的失败。

## 幂等

`idempotent:true` 是业务保证，不是开关。外部接收端必须存储 idempotencyKey 并返回同一次动作的结果。工具 timeout 使用 AbortSignal；它不能杀掉不合作的同步循环，也不能撤销已经提交的外部动作。

## 练习

增加一个“给工单追加备注”的工具。先用内存接收端模拟幂等：同键只写一次、不同键分别写入。让第一次响应丢失但写入成功，验证第二次调用返回原结果。随后把超时误设为“未执行”并观察重复写入，理解为什么不明结果需要人工核对。


## v0.2 集成补充

主体验入口与当前启动命令见 [QUICKSTART](../QUICKSTART.md)；框架职责见 [LangChain / LangGraph](LANGCHAIN-LANGGRAPH.md)，各模块实际可用范围见 [能力清单](CAPABILITIES.md)。原生教学接口仍保留，不能直接代替框架检查点或审批状态。
