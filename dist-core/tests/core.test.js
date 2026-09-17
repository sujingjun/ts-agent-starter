import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, validate, checkSchema, s, canonical, buildContext, estimateTokens, validateMessageSequence, chunkDocument, EvidenceIndex, cosine, reciprocalRankFusion, verifyCitations, NoteMemory, SkillCatalog, parseSkill, Workflow, planAndSolve, reflect, ScriptedModel, finalTurn, tokenF1 } from '../src/core/index.js';
for (const [expression, expected] of [['2+3*4', 14], ['(2+3)*4', 20], ['-2*-3', 6], ['2--3', 5], ['0.5+.25', .75], ['10%3', 1], ['15+30+25', 70], ['+2', 2], ['(8/2)/(1+1)', 2]])
    test('算术 ' + expression, () => assert.equal(calculate(expression), expected));
for (const expression of ['', '1/0', '1%0', 'process.exit()', '1;2', '1 +', '((1)', '2(3)', 'NaN', '1e9'])
    test('拒绝表达式 ' + expression, () => assert.throws(() => calculate(expression)));
test('Schema 严格对象', () => {
    const schema = s.object({ name: s.string(5), count: { type: 'integer', minimum: 1 } });
    checkSchema(schema);
    assert.doesNotThrow(() => validate(schema, { name: '测试', count: 2 }));
    for (const bad of [{ name: 'a' }, { name: 'a', count: 0 }, { name: 'a', count: 1.2 }, { name: 'abcdef', count: 1 }, { name: 'a', count: 1, secret: true }])
        assert.throws(() => validate(schema, bad));
});
test('未知 Schema 不静默接受', () => assert.throws(() => checkSchema({ type: 'string', pattern: '.*' })));
test('对象必须禁止额外参数', () => assert.throws(() => checkSchema({ type: 'object' })));
test('JSON 不接受原型污染', () => assert.throws(() => validate(s.object({}), JSON.parse('{"__proto__":{}}'))));
test('JSON 不接受非有限数值', () => assert.throws(() => validate(s.number(), NaN)));
test('Schema 数组边界', () => { const schema = { type: 'array', items: s.number(), minItems: 1, maxItems: 2 }; assert.throws(() => validate(schema, [])); assert.throws(() => validate(schema, [1, 2, 3])); assert.throws(() => validate(schema, ['1'])); validate(schema, [1, 2]); });
test('参数规范化稳定', () => assert.equal(canonical({ a: 1, b: 2 }), canonical({ b: 2, a: 1 })));
const messages = [{ role: 'system', content: '规则' }, { role: 'user', content: 'x'.repeat(3000) }, { role: 'assistant', content: 'old' }, { role: 'user', content: '新问题' }, { role: 'assistant', content: '', toolCalls: [{ id: 'c', name: 'calculator', arguments: { expression: '1+1' } }] }, { role: 'tool', toolCallId: 'c', content: '{"ok":true,"data":{"value":2}}' }];
test('上下文按完整轮次裁剪', () => { const selected = buildContext(messages, [], 300); assert.equal(selected[0]?.role, 'system'); assert.equal(selected[1]?.content, '新问题'); assert.ok(selected.some(m => m.toolCallId === 'c')); validateMessageSequence(selected); });
test('当前轮次过长必须报错', () => assert.throws(() => buildContext([{ role: 'system', content: 'x'.repeat(1000) }, { role: 'user', content: 'a' }], [], 30)));
test('工具元数据计入预算', () => assert.throws(() => buildContext([{ role: 'user', content: 'a' }], [{ name: 'x', description: 'x'.repeat(3000), inputSchema: s.object({}) }], 100)));
test('拒绝孤立工具消息', () => assert.throws(() => validateMessageSequence([{ role: 'tool', content: 'x', toolCallId: 'missing' }])));
test('拒绝未完成工具调用', () => assert.throws(() => validateMessageSequence(messages.slice(0, -1))));
test('Token 估算中文非零', () => assert.ok(estimateTokens('中文') >= 2));
const doc = { id: 'doc', tenantId: 'a', title: '工具安全', text: '工具权限由服务端控制。审批并不等于无限授权。', source: 'local://doc', updatedAt: '2026-09-17' };
test('分块偏移对应原文', () => {
    for (const c of chunkDocument(doc, 10, 3))
        assert.equal(c.text, doc.text.slice(c.start, c.end));
});
test('分块 ID 可复现', () => assert.deepEqual(chunkDocument(doc), chunkDocument(doc)));
test('分块参数防死循环', () => assert.throws(() => chunkDocument(doc, 10, 10)));
test('检索不能跨租户', () => { const index = new EvidenceIndex(); index.add(doc); assert.ok(index.search('a', '权限').length); assert.equal(index.search('b', '权限').length, 0); });
test('中文问题可检索', () => { const index = new EvidenceIndex(); index.add(doc); assert.match(index.search('a', '工具权限')[0].text, /服务端/); });
test('同一文档更新替换旧块', () => { const index = new EvidenceIndex(); index.add({ ...doc, text: 'apple' }); index.add({ ...doc, text: 'banana' }); assert.equal(index.search('a', 'apple').length, 0); assert.equal(index.search('a', 'banana').length, 1); });
test('向量维度不一致被拒绝', () => assert.throws(() => cosine([1], [1, 2])));
test('余弦相似度', () => assert.equal(cosine([1, 0], [0, 1]), 0));
test('融合去除单榜重复', () => { const rows = reciprocalRankFusion([['a', 'a', 'b'], ['b', 'a']]); assert.equal(rows.length, 2); assert.equal(rows[0].score, rows[1].score); });
test('识别未知引用', () => { assert.equal(verifyCitations('根据[e-1]', new Set(['e-1'])).valid, true); assert.equal(verifyCitations('根据[e-2]', new Set(['e-1'])).valid, false); assert.equal(verifyCitations('无引用', new Set()).valid, false); });
test('记忆作用域、过期、删除', () => { const m = new NoteMemory(); const n = m.add({ tenantId: 'a', subjectId: 'u', text: '事实', source: '用户确认', expiresAt: 20 }, 10); assert.equal(m.recall('b', 'u', 11).length, 0); assert.equal(m.recall('a', 'v', 11).length, 0); assert.equal(m.recall('a', 'u', 20).length, 0); assert.equal(m.forget('b', n.id), false); assert.equal(m.forget('a', n.id), true); });
test('记忆写入必须有来源', () => assert.throws(() => new NoteMemory().add({ tenantId: 'a', subjectId: 'u', text: 'a', source: '' })));
const skillText = '---\nname: research-report\ndescription: >-\n  在研究公开信息时使用。\n  需要引用。\n---\n# 执行\n读取证据再撰写。';
test('Skill 元数据不加载正文', () => { const c = new SkillCatalog(); c.add(parseSkill(skillText)); assert.ok(!('body' in c.metadata()[0])); assert.match(c.load('research-report').body, /读取证据/); });
test('Skill 不接受提权元数据', () => assert.throws(() => parseSkill('---\nname: x\ndescription: x\npermissions: all\n---\nx')));
test('Skill 重复名称失败', () => { const c = new SkillCatalog(); c.add(parseSkill(skillText)); assert.throws(() => c.add(parseSkill(skillText))); });
test('Workflow 显式依赖顺序', async () => { const f = new Workflow([{ id: 'a', dependsOn: [], run: async () => ({ n: 2 }) }, { id: 'b', dependsOn: ['a'], run: async (s) => ({ answer: Number(s['n']) * 2 }) }]); const r = await f.run({}); assert.deepEqual(r.order, ['a', 'b']); assert.equal(r.state['answer'], 4); });
test('Workflow 环检测', async () => { const f = new Workflow([{ id: 'a', dependsOn: ['b'], run: async () => ({}) }, { id: 'b', dependsOn: ['a'], run: async () => ({}) }]); await assert.rejects(f.run({}), /依赖有环/); });
test('PlanAndSolve 保留逐步执行语义', async () => { const m = new ScriptedModel([finalTurn('["计算周二","计算总量"]'), finalTurn('30'), finalTurn('70')]); const r = await planAndSolve(m, '苹果总量'); assert.equal(r.answer, '70'); assert.equal(r.steps.length, 2); assert.match(m.calls[2].messages[1].content, /30/); });
test('规划不是 JSON 时明确失败', async () => assert.rejects(planAndSolve(new ScriptedModel([finalTurn("['a']")]), 'a'), /有效 JSON/));
test('反思有界且保留审查记录', async () => { const m = new ScriptedModel([finalTurn('初稿'), finalTurn('{"approved":false,"feedback":"缺少来源"}'), finalTurn('修订'), finalTurn('{"approved":true,"feedback":"完成"}')]); const r = await reflect(m, '写作', 1); assert.equal(r.approved, true); assert.equal(r.answer, '修订'); assert.equal(r.reviews.length, 2); });
test('反思用尽预算不假装成功', async () => { const r = await reflect(new ScriptedModel([finalTurn('初稿'), finalTurn('{"approved":false,"feedback":"不通过"}')]), '写作', 0); assert.equal(r.approved, false); });
test('F1 处理重复和空值', () => { assert.equal(tokenF1('', ''), 1); assert.equal(tokenF1('aa', 'a'), 2 / 3); });
//# sourceMappingURL=core.test.js.map