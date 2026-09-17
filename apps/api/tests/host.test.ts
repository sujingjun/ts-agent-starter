import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { randomUUID } from 'node:crypto';
import { StudioHost } from '../../../integrations/langchain/host.js';
import { EvidenceIndex, SkillCatalog } from '../../../src/core/index.js';
import { NoteStore } from '../../../src/features/notes.js';
async function setup(){
  process.env['MODEL_MODE']='demo';process.env['CHECKPOINT_MODE']='memory';
  const root=await mkdtemp(join(tmpdir(),'starter-host-'));const index=new EvidenceIndex();
  for(const doc of JSON.parse(await readFile('data/knowledge.json','utf8')))index.add(doc);
  const services={index,notes:new NoteStore(join(root,'notes')),skills:new SkillCatalog(),tenantId:'local'};
  return {root,services,host:await StudioHost.create(services,root)};
}
async function done(host:StudioHost,id:string){for(let n=0;n<200;n++){const r=await host.get(id);if(!['queued','running'].includes(r.status)){await new Promise(r=>setTimeout(r,10));return r;}await new Promise(r=>setTimeout(r,10));}throw new Error('Host未完成');}
test('StudioHost保存真实框架流事件并支持同线程继续',async()=>{
 const {host,root}=await setup();try{
  const a=await host.create({engine:'agent',prompt:'计算 (2+3)*4'});const first=await done(host,a.id);
  assert.equal(first.status,'completed',JSON.stringify(first.error));
  assert.match(JSON.stringify(first.output),/20/);assert.ok(first.events.some(e=>e.type==='tool.started'));
  const b=await host.create({engine:'agent',prompt:'我刚才问了什么',previousRunId:a.id});
  assert.equal(a.threadId,b.threadId);assert.match(JSON.stringify((await done(host,b.id)).output),/2\+3/);
  assert.ok((await host.history(b.id)).rows.length);await assert.rejects(host.get(randomUUID()),/运行不存在/);
 }finally{await host.onModuleDestroy();await rm(root,{recursive:true,force:true});}
});
test('StudioHost审批不能由恢复绕过，批准后才有产物',async()=>{
 const {host,root}=await setup();try{
  const run=await host.create({engine:'research',prompt:'MCP 工具'});let result=await done(host,run.id);
  assert.equal(result.status,'waiting_approval',JSON.stringify(result.error));
  await assert.rejects(host.artifact(run.id));await assert.rejects(host.resume(run.id));
  await host.approve(run.id,true);result=await done(host,run.id);assert.equal(result.status,'completed');
  assert.ok((await host.artifact(run.id)) as object);await assert.rejects(host.approve(run.id,true));
 }finally{await host.onModuleDestroy();await rm(root,{recursive:true,force:true});}
});
test('文件运行记录不会被当成丢失的内存checkpoint',async()=>{
 const {host,root,services}=await setup();let next:StudioHost|undefined;
 try{
  const run=await host.create({engine:'agent',prompt:'计算 2+3'});await done(host,run.id);await host.onModuleDestroy();
  next=await StudioHost.create(services,root);assert.equal((await next.get(run.id)).status,'completed');
  await assert.rejects(next.create({engine:'agent',prompt:'继续',previousRunId:run.id}),/找不到会话/);
 }finally{await host.onModuleDestroy();await next?.onModuleDestroy();await rm(root,{recursive:true,force:true});}
});
