import test from 'node:test';
import assert from 'node:assert/strict';
import { MemorySaver, Command } from '@langchain/langgraph';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EvidenceIndex, SkillCatalog } from '../../../src/core/index.js';
import { NoteStore } from '../../../src/features/notes.js';
import { DemoChatModel } from '../model.js';
import { makeAgent, selectContext } from '../agent.js';
import { makeResearch, reportIssues, ReportSchema } from '../research.js';
async function setup() {
  const root=await mkdtemp(join(tmpdir(),'starter-langchain-'));
  const index=new EvidenceIndex();
  const rows=JSON.parse(await readFile(join(process.cwd(),'data/knowledge.json'),'utf8'));
  for(const row of rows) index.add(row);
  return {root,services:{index,notes:new NoteStore(join(root,'notes')),skills:new SkillCatalog(),tenantId:'local'},config:{configurable:{thread_id:randomUUID()},recursionLimit:40}};
}
test('真正的 createAgent 使用演示模型调用计算器',async()=>{
  const {root,services,config}=await setup();
  try {
    const agent=makeAgent(new DemoChatModel(),services,new MemorySaver());
    const out=await agent.invoke({messages:[{role:'user',content:'计算 (2+3)*4'}]},config);
    assert.match(String(out.messages.at(-1)?.content),/20/);
    assert.ok(out.messages.some(m=>m.getType()==='tool'));
    const next=await agent.invoke({messages:[{role:'user',content:'我刚才问了什么'}]},config);
    assert.match(String(next.messages.at(-1)?.content),/\(2\+3\)\*4/);
  } finally {await rm(root,{recursive:true,force:true});}
});
test('LangChain middleware 暂停并拒绝写入',async()=>{
  const {root,services,config}=await setup();
  try {
    const agent=makeAgent(new DemoChatModel(),services,new MemorySaver());
    await agent.invoke({messages:[{role:'user',content:'记住：TypeScript'}]},config);
    const state=await agent.getState(config);
    assert.ok(state.tasks.some(t=>t.interrupts?.length));
    assert.equal((await services.notes.list('local')).length,0);
    await agent.invoke(new Command({resume:{decisions:[{type:'reject',message:'本次不保存'}]}}),config);
    assert.equal((await services.notes.list('local')).length,0);
  } finally {await rm(root,{recursive:true,force:true});}
});
test('LangChain middleware 批准后保存',async()=>{
  const {root,services,config}=await setup();
  try {
    const agent=makeAgent(new DemoChatModel(),services,new MemorySaver());
    await agent.invoke({messages:[{role:'user',content:'记住：NestJS'}]},config);
    await agent.invoke(new Command({resume:{decisions:[{type:'approve'}]}}),config);
    assert.equal((await services.notes.list('local')).length,1);
  } finally {await rm(root,{recursive:true,force:true});}
});
test('LangGraph 并行检索、结构化报告、审批、产物与历史',async()=>{
  const {root,services,config}=await setup();
  try {
    const graph=makeResearch(new DemoChatModel(),services,new MemorySaver(),root);
    const initial=await graph.invoke({query:'MCP 工具'},config);
    assert.ok(initial.evidence.length);
    ReportSchema.parse(initial.report);
    assert.equal(initial.artifactId,'');
    const state=await graph.getState(config);
    assert.ok(state.tasks.some(t=>t.interrupts?.length));
    const done=await graph.invoke(new Command({resume:{approve:true}}),config);
    assert.equal(done.outcome,'exported'); assert.match(done.artifactId,/^[a-f0-9]{64}$/);
    const history=[]; for await(const row of graph.getStateHistory(config)) history.push(row);
    assert.ok(history.length>=5);
  } finally {await rm(root,{recursive:true,force:true});}
});
test('LangGraph 拒绝与无证据分支不保存产物',async()=>{
  const {root,services,config}=await setup();
  try {
    const graph=makeResearch(new DemoChatModel(),services,new MemorySaver(),root);
    await graph.invoke({query:'MCP'},config);
    const denied=await graph.invoke(new Command({resume:{approve:false}}),config);
    assert.equal(denied.outcome,'rejected'); assert.equal(denied.artifactId,'');
    const empty=await graph.invoke({query:'zzzz-unmatched-evidence-999999'},{configurable:{thread_id:randomUUID()}});
    assert.equal(empty.outcome,'evidence_missing'); assert.deepEqual(empty.report?.claims,[]);
  } finally {await rm(root,{recursive:true,force:true});}
});
test('上下文裁剪保留完整工具消息组',()=>{
  const rows=[new HumanMessage('a'.repeat(500)),new AIMessage('old'),new HumanMessage('now'),new AIMessage({content:'',tool_calls:[{name:'x',args:{},id:'1',type:'tool_call'}]}),new ToolMessage({content:'ok',tool_call_id:'1'})];
  const result=selectContext(rows,1500);
  assert.equal(result.at(-1)?.getType(),'tool');
  assert.ok(result.some(m=>m.getType()==='ai'));
  assert.throws(()=>selectContext([new HumanMessage('x'.repeat(2000))],100));
});
test('引用校验拒绝模型捏造的编号',()=>{
  assert.equal(reportIssues({title:'t',summary:'s',claims:[{text:'unsupported',sourceIds:['missing']}],limitations:[]},[]).length,1);
});
