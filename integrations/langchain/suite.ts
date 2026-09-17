import { MemorySaver } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { makeChatModel } from './model.js';
import { makeAgent } from './agent.js';
import { makeResearch } from './research.js';
import type { ToolServices } from './tools.js';

export async function makeSuite(services:ToolServices,root:string) {
  const mode=process.env['CHECKPOINT_MODE'] ?? 'memory';
  if(!['memory','postgres'].includes(mode)) throw new Error('CHECKPOINT_MODE 必须是 memory 或 postgres');
  const uri=process.env['DATABASE_URL'];
  if(mode==='postgres'&&!uri) throw new Error('PostgreSQL checkpoint 缺少 DATABASE_URL');
  const checkpointer=mode==='postgres'?PostgresSaver.fromConnString(uri!):new MemorySaver();
  const model=makeChatModel();
  return {
    agent:makeAgent(model,services,checkpointer),
    research:makeResearch(model,services,checkpointer,root),
    checkpointer, checkpointMode:mode,
    close:async()=>{if(checkpointer instanceof PostgresSaver) await checkpointer.end();},
  };
}
