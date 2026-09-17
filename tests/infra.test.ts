import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, symlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { safePath, fileTools } from '../src/infra/file-tools.js';
import { PostgresRunStore, PgVectorStore } from '../src/infra/postgres.js';
import type { SqlPort } from '../src/infra/postgres.js';
import { tavilySearchTool, runDifyWorkflow } from '../src/infra/search.js';
const context = { runId: 'r', tenantId: 'a', sessionId: 's', signal: new AbortController().signal, idempotencyKey: 'test' };
test('文件路径越界被拒绝', async () => { const root = await mkdtemp(join(tmpdir(), 'agent-files-')); try {
    await assert.rejects(safePath(root, '../secret'));
    await assert.rejects(safePath(root, '/etc/passwd'));
}
finally {
    await rm(root, { recursive: true, force: true });
} });
test('符号链接不能越权读取', async () => { const root = await mkdtemp(join(tmpdir(), 'agent-files-')); try {
    await symlink('/etc/passwd', join(root, 'secret'));
    await assert.rejects(safePath(root, 'secret'), /符号链接/);
}
finally {
    await rm(root, { recursive: true, force: true });
} });
test('补丁带哈希前置条件且只改唯一文本', async () => { const root = await mkdtemp(join(tmpdir(), 'agent-files-')); try {
    await writeFile(join(root, 'a.txt'), 'hello');
    const patch = fileTools(root).find(t => t.name === 'apply_patch')!;
    await assert.rejects(patch.execute({ path: 'a.txt', expectedSha256: 'bad', before: 'hello', after: 'world' }, context), /变化/);
    await patch.execute({ path: 'a.txt', expectedSha256: createHash('sha256').update('hello').digest('hex'), before: 'hello', after: 'world' }, context);
    assert.equal(await readFile(join(root, 'a.txt'), 'utf8'), 'world');
}
finally {
    await rm(root, { recursive: true, force: true });
} });
test('diff 检查返回具体新增行', async () => { const t = fileTools('.').find(t => t.name === 'review_diff')!; const r = await t.execute({ diff: '- eval(old)\n+ eval(input)' }, context) as {
    findings: {
        line: number;
    }[];
}; assert.equal(r.findings.length, 1); assert.equal(r.findings[0]?.line, 2); });
test('Postgres 查询含租户参数（SQL 契约测试，非真实数据库）', async () => { let sql = ''; let values: unknown[] = []; const db: SqlPort = { async query(s, v) { sql = s; values = v ?? []; return { rows: [] }; } }; await new PostgresRunStore(db).get('a', 'id'); assert.match(sql, /tenant_id=\$1/); assert.deepEqual(values, ['a', 'id']); });
test('pgvector 维度和模型同时过滤（契约测试）', async () => { let sql = ''; let values: unknown[] = []; const db: SqlPort = { async query(s, v) { sql = s; values = v ?? []; return { rows: [] }; } }; await new PgVectorStore(db).search('a', 'model', [1, 0]); assert.match(sql, /embedding_model=\$2/); assert.match(sql, /dimensions=\$4/); assert.equal(values[3], 2); });
test('搜索服务结果保留来源编号', async () => { const t = tavilySearchTool('test', async () => new Response(JSON.stringify({ results: [{ url: 'https://source.example/x', title: '示例', content: '正文' }] }))); const r = await t.execute({ query: 'x' }, context) as {
    hits: {
        id: string;
        source: string;
    }[];
}; assert.match(r.hits[0]!.id, /^e-/); assert.equal(r.hits[0]!.source, 'https://source.example/x'); });
test('Dify 发送阻塞工作流契约', async () => { let payload: Record<string, unknown> = {}; await runDifyWorkflow('https://dify.example/v1', 'test', { question: 'a' }, 'a', context.signal, async (_u, init) => { payload = JSON.parse(String(init?.body)); return new Response('{"data":{"status":"succeeded"}}'); }); assert.equal(payload['response_mode'], 'blocking'); assert.equal(payload['user'], 'a'); });
test('队列按服务端租户领取且 SQL 使用跳锁（契约测试）', async () => {
    const { PostgresQueue } = await import('../src/infra/postgres.js');
    let sql = '';
    let values: unknown[] = [];
    const db: SqlPort = { async query(text, args) { sql = text; values = args ?? []; return { rows: [{ tenant_id: 'tenant-a', run_id: 'run-1' }] }; } };
    const job = await new PostgresQueue(db).claim('worker-1', 60, 'tenant-a');
    assert.equal(job?.tenantId, 'tenant-a');
    assert.match(sql, /SKIP LOCKED/);
    assert.match(sql, /tenant_id=\$3/);
    assert.deepEqual(values, ['worker-1', 60, 'tenant-a']);
});
