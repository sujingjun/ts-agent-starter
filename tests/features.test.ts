import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NoteStore, noteTools } from '../src/features/notes.js';
import { AgentRunner, ToolRegistry, MemoryRunStore, DemoModel } from '../src/core/index.js';
import { EXPERIENCE_CATALOG } from '../src/features/catalog.js';

test('长期笔记按租户隔离、按内容幂等、可跨实例读取', async () => {
  const dir=await mkdtemp(join(tmpdir(),'starter-notes-'));
  try {
    const store=new NoteStore(dir);
    const first=await store.save('a','技术栈','TypeScript');
    const second=await store.save('a','技术栈','TypeScript');
    assert.deepEqual(first,second);
    assert.equal((await new NoteStore(dir).list('a')).length,1);
    assert.equal((await store.list('b')).length,0);
    await assert.rejects(store.save('a','','text'));
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('离线演示走真实审批，批准后才写入', async () => {
  const dir=await mkdtemp(join(tmpdir(),'starter-approve-'));
  try {
    const notes=new NoteStore(dir);
    const registry=new ToolRegistry();
    for(const t of noteTools(notes)) registry.register(t);
    const runner=new AgentRunner({model:new DemoModel(),registry,store:new MemoryRunStore()});
    const run=await runner.create({tenantId:'local',prompt:'记住：我的技术栈是 TS'});
    let out=await runner.execute('local',run.id);
    assert.equal(out.status,'waiting_approval');
    assert.equal((await notes.list('local')).length,0);
    await runner.approve('local',run.id,out.pending[0]!.call.id,true);
    out=await runner.execute('local',run.id);
    assert.equal(out.status,'completed');
    assert.equal((await notes.list('local')).length,1);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('体验清单每个模块都有问题、期望与文档入口', () => {
  assert.equal(new Set(EXPERIENCE_CATALOG.map(x=>x.id)).size,EXPERIENCE_CATALOG.length);
  for(const row of EXPERIENCE_CATALOG) { assert.ok(row.prompt); assert.ok(row.expect); assert.ok(row.doc.endsWith('.md')); }
});
