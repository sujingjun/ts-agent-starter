import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Annotation, StateGraph, START, END, interrupt, Command } from '@langchain/langgraph';
import { readFile } from 'node:fs/promises';
import { PostgresRunStore, PostgresQueue, PgVectorStore } from '../dist-core/src/infra/postgres.js';
import { AgentRunner, ToolRegistry, DemoModel, calculatorTool } from '../dist-core/src/core/index.js';
const uri=process.env.DATABASE_URL;if(!uri)throw new Error('test:postgres 需要独立测试 DATABASE_URL；不会用跳过冒充通过');
const pool=new pg.Pool({connectionString:uri});const tenant='test-'+randomUUID();
let saver;
try {
  await pool.query(await readFile('infra/migrations/001-core.sql','utf8'));
  const store=new PostgresRunStore(pool);const runner=new AgentRunner({store,model:new DemoModel(),registry:new ToolRegistry().register(calculatorTool())});
  const run=await runner.create({tenantId:tenant,prompt:'计算 2+3'});assert.equal((await runner.execute(tenant,run.id)).status,'completed');
  assert.equal(await store.get('other',run.id),undefined);
  const queue=new PostgresQueue(pool);await queue.enqueue(tenant,run.id);const job=await queue.claim('test-owner',60,tenant);assert.equal(job.runId,run.id);await queue.finish(tenant,run.id,'test-owner','done');
  await pool.query(await readFile('infra/migrations/002-vector.sql','utf8'));
  const vectors=new PgVectorStore(pool);
  await vectors.put(tenant,'test-evidence','fixture-v1','TS test','local://fixture',[1,0,0]);
  assert.equal((await vectors.search(tenant,'fixture-v1',[1,0,0]))[0].id,'test-evidence');
  assert.equal((await vectors.search('other','fixture-v1',[1,0,0])).length,0);
  const State=Annotation.Root({approved:Annotation()});
  const build=cp=>new StateGraph(State).addNode('gate',()=>({approved:interrupt({question:'批准测试？'})})).addEdge(START,'gate').addEdge('gate',END).compile({checkpointer:cp});
  saver=PostgresSaver.fromConnString(uri);await saver.setup();const config={configurable:{thread_id:tenant}};
  await build(saver).invoke({},config);await saver.end();saver=PostgresSaver.fromConnString(uri);
  const result=await build(saver).invoke(new Command({resume:true}),config);assert.equal(result.approved,true);
  console.log('通过：PostgreSQL 原生存储、租户隔离、队列租约、重新建立数据库连接后的 LangGraph 审批恢复。');
} finally {
  await pool.query('DELETE FROM evidence_vectors WHERE tenant_id=$1',[tenant]).catch(()=>{});
  await pool.query('DELETE FROM agent_jobs WHERE tenant_id=$1',[tenant]).catch(()=>{});
  await pool.query('DELETE FROM agent_runs WHERE tenant_id=$1',[tenant]).catch(()=>{});
  if(saver){await saver.deleteThread(tenant).catch(()=>{});await saver.end();}
  await pool.end();
}
