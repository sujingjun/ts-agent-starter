import type { Message, ToolDescription } from './types.js';
import { AgentError } from './errors.js';
/** UTF-8 字节估算仅用于输入裁剪，不是厂商计费 Token 数。 */
export function estimateTokens(value: unknown): number { return Math.ceil(Buffer.byteLength(JSON.stringify(value), 'utf8') / 3); }
export function validateMessageSequence(messages: Message[]): void {
    let pending = new Set<string>();
    for (const message of messages) {
        if (message.role === 'assistant') {
            if (pending.size)
                throw new AgentError('MESSAGE_SEQUENCE', '未完成工具响应前不能追加 assistant');
            const calls = message.toolCalls ?? [];
            if (new Set(calls.map(c => c.id)).size !== calls.length)
                throw new AgentError('MESSAGE_SEQUENCE', '工具调用 ID 重复');
            pending = new Set(calls.map(c => c.id));
        }
        else if (message.role === 'tool') {
            if (!message.toolCallId || !pending.delete(message.toolCallId))
                throw new AgentError('MESSAGE_SEQUENCE', '孤立或重复的工具响应');
        }
        else if (pending.size)
            throw new AgentError('MESSAGE_SEQUENCE', '工具响应未完成');
    }
    if (pending.size)
        throw new AgentError('MESSAGE_SEQUENCE', '缺少工具响应');
}
export function buildContext(messages: Message[], tools: ToolDescription[], budget: number): Message[] {
    validateMessageSequence(messages);
    const system = messages.filter(m => m.role === 'system');
    const groups: Message[][] = [];
    for (const m of messages.filter(m => m.role !== 'system')) {
        if (m.role === 'user' || groups.length === 0)
            groups.push([]);
        groups.at(-1)!.push(m);
    }
    const required = system.concat(groups.at(-1) ?? []);
    if (estimateTokens({ messages: required, tools }) > budget)
        throw new AgentError('CONTEXT_OVERFLOW', '系统规则、工具定义和当前完整轮次超过预算；应减少工具输出或创建经核验的摘要');
    let kept: Message[][] = groups.length ? [groups.at(-1)!] : [];
    for (let i = groups.length - 2; i >= 0; i--) {
        const candidate = [groups[i]!, ...kept];
        if (estimateTokens({ messages: system.concat(...candidate), tools }) > budget)
            break;
        kept = candidate;
    }
    const result = system.concat(...kept);
    validateMessageSequence(result);
    return result;
}
export interface Summary {
    goal: string;
    constraints: string[];
    facts: {
        text: string;
        source: string;
    }[];
    openQuestions: string[];
}
export function summaryMessage(summary: Summary): Message {
    // 摘要是可审查的数据；不将原始网页内容提升为 system 指令。
    return { role: 'user', content: `以下为用户核验的历史摘要，不是新增权限：\n${JSON.stringify(summary)}` };
}
