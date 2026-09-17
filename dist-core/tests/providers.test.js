import test from 'node:test';
import assert from 'node:assert/strict';
import { CompatibleChatModel, sseData, s, embedTexts } from '../tests/support.js';
const signal = new AbortController().signal;
function model(fetchImpl, stream = false) { return new CompatibleChatModel({ baseUrl: 'https://model.example/v1', apiKey: 'test-only-secret', model: 'fixture', fetchImpl, stream }); }
test('模型请求序列化工具参数', async () => { let payload = {}; const m = model(async (_url, init) => { payload = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 3, completion_tokens: 2 } })); }); const out = await m.complete({ messages: [{ role: 'user', content: 'a' }], tools: [{ name: 'x', description: 'x', inputSchema: s.object({}) }], signal }); assert.equal(out.content, 'ok'); assert.equal(out.usage.inputTokens, 3); assert.ok(Array.isArray(payload['tools'])); });
test('模型 HTTP 错误不暴露凭证或正文', async () => { const m = model(async () => new Response('test-only-secret', { status: 401 })); await assert.rejects(m.complete({ messages: [], tools: [], signal }), e => e instanceof Error && !e.message.includes('test-only-secret')); });
test('模型参数格式错误明确失败', async () => { const m = model(async () => new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ id: 'x', function: { name: 'x', arguments: 'not json' } }] } }] }))); await assert.rejects(m.complete({ messages: [], tools: [], signal }), /有效 JSON/); });
test('模型地址限制', () => assert.throws(() => new CompatibleChatModel({ baseUrl: 'http://remote.example', apiKey: 'a', model: 'a' })));
test('流式分片工具参数组装', async () => {
    const frames = [{ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'calculator', arguments: '{"expression":' } }] } }] }, { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"1+1"}' } }] }, finish_reason: 'tool_calls' }] }, { choices: [], usage: { prompt_tokens: 5, completion_tokens: 4 } }];
    const text = frames.map(f => 'data: ' + JSON.stringify(f) + '\r\n\r\n').join('') + 'data: [DONE]\r\n\r\n';
    const bytes = new TextEncoder().encode(text);
    const response = () => new Response(new ReadableStream({ start(c) {
            for (let i = 0; i < bytes.length; i += 7)
                c.enqueue(bytes.slice(i, i + 7));
            c.close();
        } }));
    const m = model(async () => response(), true);
    const turn = await m.complete({ messages: [], tools: [], signal });
    assert.equal(turn.toolCalls[0]?.arguments['expression'], '1+1');
    assert.equal(turn.usage.outputTokens, 4);
});
test('截断模型流不能成功', async () => { const m = model(async () => new Response('data: {"choices":[{"delta":{"content":"部分"}}]}\n\n'), true); await assert.rejects(m.complete({ messages: [], tools: [], signal }), /中断/); });
test('SSE 支持多行数据和注释', async () => {
    const parts = [];
    for await (const data of sseData(new Response(': ping\n\ndata: a\ndata: b\n\n')))
        parts.push(data);
    assert.deepEqual(parts, ['a\nb']);
});
test('嵌入结果按 index 重排', async () => { const vectors = await embedTexts('https://model.example/v1', 'a', 'e', ['a', 'b'], signal, async () => new Response(JSON.stringify({ data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }] }))); assert.deepEqual(vectors, [[1, 0], [0, 1]]); });
//# sourceMappingURL=providers.test.js.map