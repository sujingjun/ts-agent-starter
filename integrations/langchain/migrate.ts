import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
const uri=process.env['DATABASE_URL'];
if(!uri) throw new Error('缺少 DATABASE_URL');
const saver=PostgresSaver.fromConnString(uri);
try { await saver.setup(); console.log('LangGraph checkpoint 表已初始化'); }
finally { await saver.end(); }
