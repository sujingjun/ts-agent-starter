import { AgentError, invariant } from './errors.js';
import { objectInput } from './schema.js';
const usage0 = () => ({ inputTokens: 0, outputTokens: 0 });
export class ScriptedModel {
    name = 'scripted-test-only';
    turns;
    calls = [];
    constructor(turns) { this.turns = structuredClone(turns); }
    async complete(request) { this.calls.push(request); const turn = this.turns.shift(); invariant(turn, 'SCRIPT_EXHAUSTED', '测试脚本没有更多响应'); return turn; }
}
export function finalTurn(content) { return { content, toolCalls: [], usage: usage0() }; }
export function callTurn(name, args, id = 'call-1') { return { content: '', toolCalls: [{ id, name, arguments: args }], usage: usage0() }; }
/** 明确标记的离线规则模型，仅验证数据链路，不代表任何真实大模型能力。 */
export class DemoModel {
    name = 'offline-rule-fixture-NOT-LLM';
    async complete(request) {
        const last = request.messages.at(-1);
        if (last?.role === 'tool') {
            const output = JSON.parse(last.content);
            if (!output.ok)
                return finalTurn(`离线示例：工具失败，${output.error?.message ?? '原因未知'}。`);
            const data = output.data;
            if (Array.isArray(data?.hits)) {
                const hits = data.hits;
                return finalTurn(hits.length ? '离线证据报告（固定规则，不是真实模型推理）\n\n' + hits.map((h, i) => `${i + 1}. ${h.title}\n${h.text}\n[${h.id}] ${h.source}`).join('\n\n') : '未检索到证据，不能形成结论。');
            }
            return finalTurn('离线工具结果：' + JSON.stringify(output.data));
        }
        const question = [...request.messages].reverse().find(m => m.role === 'user')?.content ?? '';
        const available = new Set(request.tools.map(t => t.name));
        const callId = 'demo-call-' + (request.messages.flatMap(m => m.toolCalls ?? []).length + 1);
        if (question.startsWith('记住：') && available.has('save_note'))
            return callTurn('save_note', { title: '用户明确要求保存的笔记', text: question.slice(3).trim() }, callId);
        if (question.includes('读取笔记') && available.has('read_notes'))
            return callTurn('read_notes', {}, callId);
        const expression = question.match(/(?:计算|calculate)\s*([\d.()+\-*/%\s]+)/i)?.[1]?.trim();
        if (expression && available.has('calculator'))
            return callTurn('calculator', { expression }, callId);
        if (available.has('search_documents'))
            return callTurn('search_documents', { query: question }, callId);
        return finalTurn('离线模式仅演示计算与本地检索。配置 LLM_BASE_URL、LLM_MODEL、LLM_API_KEY 后使用真实模型。');
    }
}
/** 兼容 Chat Completions 的服务适配器；不同服务对 tools / stream / usage 的支持需单独验收。 */
export class CompatibleChatModel {
    name;
    options;
    constructor(options) {
        const u = new URL(options.baseUrl);
        invariant(u.protocol === 'https:' || (options.allowLocalHttp === true && u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)), 'MODEL_URL', '模型地址必须 HTTPS；本地 HTTP 需显式启用');
        invariant(!u.username && !u.password, 'MODEL_URL', 'URL 不能包含凭证');
        invariant(options.apiKey && options.model, 'MODEL_CONFIG', '真实模型必须显式配置凭证和模型 ID');
        this.options = options;
        this.name = options.model;
    }
    async complete(request) {
        const body = {
            model: this.options.model,
            messages: request.messages.map(m => ({ role: m.role, content: m.content,
                ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
                ...(m.toolCalls?.length ? { tool_calls: m.toolCalls.map(c => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.arguments) } })) } : {}) })),
            ...(request.tools.length ? { tools: request.tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } })) } : {}),
            stream: this.options.stream ?? false,
            ...(this.options.stream && this.options.includeStreamUsage ? { stream_options: { include_usage: true } } : {}),
        };
        const response = await (this.options.fetchImpl ?? fetch)(this.options.baseUrl.replace(/\/$/, '') + '/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.options.apiKey}` }, body: JSON.stringify(body), signal: request.signal, redirect: 'error',
        });
        if (!response.ok)
            throw new AgentError('MODEL_HTTP', `模型服务返回 HTTP ${response.status}；响应正文未写入日志以避免泄露`, response.status === 429 || response.status >= 500);
        if (this.options.stream)
            return this.parseStream(response, request);
        const raw = JSON.parse(await readBoundedText(response, this.options.maxResponseBytes ?? 2000000));
        const message = raw.choices?.[0]?.message;
        invariant(message, 'MODEL_RESPONSE', '模型响应缺少 message');
        return { content: message.content ?? '', toolCalls: (message.tool_calls ?? []).map(c => ({ id: c.id, name: c.function.name, arguments: parseArguments(c.function.arguments) })), usage: readUsage(raw.usage) };
    }
    async parseStream(response, request) {
        let content = '';
        let usage = usage0();
        let finished = false;
        const calls = new Map();
        for await (const data of sseData(response, this.options.maxResponseBytes ?? 2000000)) {
            if (data === '[DONE]') {
                finished = true;
                break;
            }
            const frame = JSON.parse(data);
            if (frame.usage)
                usage = readUsage(frame.usage);
            for (const choice of frame.choices ?? []) {
                if (choice.finish_reason)
                    finished = true;
                const delta = choice.delta;
                if (!delta)
                    continue;
                if (delta.content) {
                    content += delta.content;
                    request.onText?.(delta.content);
                }
                for (const part of delta.tool_calls ?? []) {
                    const current = calls.get(part.index) ?? { id: '', name: '', args: '' };
                    if (part.id)
                        current.id = part.id;
                    if (part.function?.name)
                        current.name += part.function.name;
                    if (part.function?.arguments)
                        current.args += part.function.arguments;
                    calls.set(part.index, current);
                }
            }
        }
        invariant(finished, 'STREAM_TRUNCATED', '模型流中断，没有结束标志');
        return { content, toolCalls: [...calls].sort((a, b) => a[0] - b[0]).map(([, c]) => ({ id: c.id, name: c.name, arguments: parseArguments(c.args) })), usage };
    }
}
function readUsage(usage) { return { inputTokens: usage?.prompt_tokens ?? 0, outputTokens: usage?.completion_tokens ?? 0 }; }
function parseArguments(value) {
    try {
        return objectInput(JSON.parse(value));
    }
    catch {
        throw new AgentError('MODEL_ARGUMENTS', '工具参数不是有效 JSON 对象');
    }
}
export async function readBoundedText(response, maxBytes) {
    invariant(response.body, 'EMPTY_RESPONSE', '响应没有正文');
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
        while (true) {
            const result = await reader.read();
            if (result.done)
                break;
            bytes += result.value.byteLength;
            if (bytes > maxBytes)
                throw new AgentError('RESPONSE_LIMIT', '响应超过长度限制');
            chunks.push(result.value);
        }
        return Buffer.concat(chunks).toString('utf8');
    }
    finally {
        await reader.cancel().catch(() => { });
        reader.releaseLock();
    }
}
export async function* sseData(response, maxBytes = 2000000) {
    invariant(response.body, 'EMPTY_STREAM', '没有流式正文');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let bytes = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                buffer += decoder.decode();
                break;
            }
            bytes += value.byteLength;
            invariant(bytes <= maxBytes, 'RESPONSE_LIMIT', '流式响应超出长度限制');
            buffer += decoder.decode(value, { stream: true });
            let match;
            while ((match = /\r?\n\r?\n/.exec(buffer))) {
                const block = buffer.slice(0, match.index);
                buffer = buffer.slice(match.index + match[0].length);
                const data = block.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).replace(/^ /, '')).join('\n');
                if (data)
                    yield data;
            }
        }
        if (buffer.trim()) {
            const data = buffer.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).replace(/^ /, '')).join('\n');
            if (data)
                yield data;
        }
    }
    finally {
        await reader.cancel().catch(() => { });
        reader.releaseLock();
    }
}
//# sourceMappingURL=providers.js.map