/** 这是体验清单，不是把未配置的外部服务标记成可用。 */
export declare const EXPERIENCE_CATALOG: readonly [{
    readonly id: "calculate";
    readonly engine: "agent";
    readonly title: "工具调用";
    readonly prompt: "计算 (2+3)*4";
    readonly expect: "calculator 返回 20";
    readonly doc: "docs/modules/agent.md";
}, {
    readonly id: "rag";
    readonly engine: "agent";
    readonly title: "证据检索";
    readonly prompt: "解释 MCP 工具授权与审批的区别";
    readonly expect: "search_documents 与证据编号";
    readonly doc: "docs/modules/rag.md";
}, {
    readonly id: "remember";
    readonly engine: "agent";
    readonly title: "写入审批";
    readonly prompt: "记住：我使用 TypeScript 和 NestJS 开发 Agent";
    readonly expect: "暂停 → 批准或拒绝 → 保存笔记";
    readonly doc: "docs/modules/approval.md";
}, {
    readonly id: "recall";
    readonly engine: "agent";
    readonly title: "长期笔记";
    readonly prompt: "读取笔记";
    readonly expect: "read_notes 返回已批准的笔记";
    readonly doc: "docs/modules/memory.md";
}, {
    readonly id: "research";
    readonly engine: "research";
    readonly title: "研究工作流";
    readonly prompt: "研究 TypeScript Agent 的工具调用、MCP 和人工审批";
    readonly expect: "并行检索 → 起草 → 引用校验 → 人工审阅 → 产物";
    readonly doc: "docs/modules/research.md";
}, {
    readonly id: "research-empty";
    readonly engine: "research";
    readonly title: "证据不足分支";
    readonly prompt: "zzzz-unmatched-evidence-999999";
    readonly expect: "明确报告证据不足，不虚构事实";
    readonly doc: "docs/TESTING.md";
}, {
    readonly id: "skill";
    readonly engine: "agent";
    readonly title: "技能加载";
    readonly prompt: "解释 Agent 的上下文管理";
    readonly skill: "research-report";
    readonly expect: "仅加载所选 Skill，不能扩大权限";
    readonly doc: "docs/modules/skills.md";
}, {
    readonly id: "context";
    readonly engine: "agent";
    readonly title: "多轮与上下文";
    readonly prompt: "继续上一轮，给出实现建议";
    readonly expect: "复用同一 thread_id，保留完整工具消息组";
    readonly doc: "docs/modules/context.md";
}];
