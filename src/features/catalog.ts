/** 这是体验清单，不是把未配置的外部服务标记成可用。 */
export const EXPERIENCE_CATALOG = [
  { id: 'calculate', engine: 'agent', title: '工具调用', prompt: '计算 (2+3)*4', expect: 'calculator 返回 20', doc: 'docs/modules/agent.md' },
  { id: 'rag', engine: 'agent', title: '证据检索', prompt: '解释 MCP 工具授权与审批的区别', expect: 'search_documents 与证据编号', doc: 'docs/modules/rag.md' },
  { id: 'remember', engine: 'agent', title: '写入审批', prompt: '记住：我使用 TypeScript 和 NestJS 开发 Agent', expect: '暂停 → 批准或拒绝 → 保存笔记', doc: 'docs/modules/approval.md' },
  { id: 'recall', engine: 'agent', title: '长期笔记', prompt: '读取笔记', expect: 'read_notes 返回已批准的笔记', doc: 'docs/modules/memory.md' },
  { id: 'research', engine: 'research', title: '研究工作流', prompt: '研究 TypeScript Agent 的工具调用、MCP 和人工审批', expect: '并行检索 → 起草 → 引用校验 → 人工审阅 → 产物', doc: 'docs/modules/research.md' },
  { id: 'research-empty', engine: 'research', title: '证据不足分支', prompt: 'zzzz-unmatched-evidence-999999', expect: '明确报告证据不足，不虚构事实', doc: 'docs/TESTING.md' },
  { id: 'skill', engine: 'agent', title: '技能加载', prompt: '解释 Agent 的上下文管理', skill: 'research-report', expect: '仅加载所选 Skill，不能扩大权限', doc: 'docs/modules/skills.md' },
  { id: 'context', engine: 'agent', title: '多轮与上下文', prompt: '继续上一轮，给出实现建议', expect: '复用同一 thread_id，保留完整工具消息组', doc: 'docs/modules/context.md' },
] as const;
