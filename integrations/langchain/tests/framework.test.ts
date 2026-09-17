import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemorySaver, Command } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { EvidenceIndex, SkillCatalog } from '../../../src/core/index.js';
import { NoteStore } from '../../../src/features/notes.js';
import { DemoChatModel } from '../model.js';
import { makeAgent, trimConversation } from '../agent.js';
import { makeResearch, ReportSchema, validateCitations } from '../research.js';
async function fixture() {
  const root=await mkdtemp(join(tmpdir(),'starter-framework-'));
  const services={tenantId:'test',index:new EvidenceIndex(),notes:new NoteStore(root),skills:new SkillCatalog(process.cwd()+'/skills')};
  services.index.ingest('test',{id:'tools',title:'工具工程',source:'https://modelcontextprotocol.io',text:'MCP 工具调用应检查参数和权限；写入操作需要明确审批。'});
  return {root,services,close:()=>rm(root,{recursive:true,force:true})};
}
test('real createAgent uses the deterministic model through tools and memory',async()=>{
  const f=await fixture();try {
    const agent=makeAgent(new DemoChatModel(),f.services,new MemorySaver()); const config={configurable:{thread_id:'t-calculator'}};
    const output=await agent.invoke({messages:[new HumanMessage('计算 (2+3)*4')]},config);
    assert.match(String(output.messages.at(-1)?.content),/20/);
    assert.ok(output.messages.some(m=>m.getType()==='tool'));
    const next=await agent.invoke({messages:[new HumanMessage('我刚才问了什么')]},config);
    assert.match(String(next.messages.at(-1)?.content),/\(2\+3\)\*4/);
  } finally{await f.close();}
});
test('human approval interrupts a write and resumes only the exact pending action',async()=>{
  const f=await fixture();try {
    const agent=makeAgent(new DemoChatModel(),f.services,new MemorySaver()); const config={configurable:{thread_id:'t-note'}};
    await agent.invoke({messages:[new HumanMessage('记住：只写 TypeScript')]},config);
    assert.equal((await f.services.notes.list('test')).length,0);
    const snap=z.object({tasks:z.array(z.object({interrupts:z.array(z.unknown()).optional()}))}).parse(await agent.getState(config));
    assert.ok(snap.tasks.some(t=>t.interrupts?.length));
    await agent.invoke(new Command({resume:{decisions:[{type:'approve'}]}}),config);
    assert.equal((await f.services.notes.list('test')).length,1);
  } finally{await f.close();}
});
test('LangGraph parallel research, structured output, review, interrupt, export and history',async()=>{
  const f=await fixture();try {
    const graph=makeResearch(new DemoChatModel(),f.services,new MemorySaver(),f.root);const config={configurable:{thread_id:'t-research'}};
    await graph.invoke({query:'MCP 工具与审批'},config);
    const pending=await graph.getState(config);assert.ok(pending.tasks.some(t=>t.interrupts?.length));
    assert.ok(ReportSchema.safeParse(pending.values.report).success);
    assert.equal(pending.values.outcome,'draft');
    const result=await graph.invoke(new Command({resume:{approve:true}}),config);
    assert.equal(result.outcome,'exported');assert.match(result.artifactId,/^[a-f0-9]{64}$/);
    const history=[];for await(const state of graph.getStateHistory(config))history.push(state);
    assert.ok(history.length>=5);
  } finally{await f.close();}
});
test('no-evidence graph branch does not invent a report or ask for approval',async()=>{
  const f=await fixture();try {
    const graph=makeResearch(new DemoChatModel(),f.services,new MemorySaver(),f.root);
    const result=await graph.invoke({query:'zzzz-unmatched-999999'},{configurable:{thread_id:'empty'}});
    assert.equal(result.outcome,'no_evidence');assert.equal(result.report,null);
  } finally{await f.close();}
});
test('citation validator rejects IDs absent from actual retrieved evidence',()=>{
  const report=ReportSchema.parse({title:'test',summary:'sum',claims:[{text:'x',sourceIds:['fake']}],limitations:[]});
  assert.equal(validateCitations(report,[]).length,1);
});
test('context trimming keeps complete human-led message groups',()=>{
  const messages=Array.from({length:50},(_,n)=>new HumanMessage(String(n)));const result=trimConversation(messages);
  assert.equal(result.length,32);assert.equal(result[0]?.content,'18');
});
test('rejected report has no export outcome',async()=>{
  const f=await fixture();try{const graph=makeResearch(new DemoChatModel(),f.services,new MemorySaver(),f.root);const config={configurable:{thread_id:'reject'}};
  await graph.invoke({query:'MCP'},config);const result=await graph.invoke(new Command({resume:{approve:false}}),config);assert.equal(result.outcome,'rejected');assert.equal(result.artifactId,'');
  }finally{await f.close();}
});
