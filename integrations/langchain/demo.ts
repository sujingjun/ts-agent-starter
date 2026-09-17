import { Command } from '@langchain/langgraph';
import { createRuntime } from '../../src/runtime.js';
import { SkillCatalog } from '../../src/core/index.js';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { makeSuite } from './suite.js';
const root=process.cwd(); const runtime=await createRuntime({root});
const skills=new SkillCatalog(); await skills.loadDirectory(resolve(root,'skills'));
const suite=await makeSuite({...runtime,skills,tenantId:'local'},root);
try {
  const mode=process.argv[2] ?? 'agent';
  const prompt=process.argv.slice(3).filter(x=>x!=='--approve').join(' ') || (mode==='agent'?'计算 (2+3)*4':'研究 MCP 和 TypeScript Agent 工具调用');
  const config={configurable:{thread_id:'cli-'+randomUUID()},recursionLimit:40};
  if(mode==='agent') {
    const output=await suite.agent.invoke({messages:[{role:'user',content:prompt}]},config);
    console.log(output.messages.at(-1)?.content);
  } else {
    const output=await suite.research.invoke({query:prompt},config);
    console.log('首次运行结果（此时尚未批准导出）：',output);
    // CLI 演示不自动授权。显式传 --approve 才批准写入本地报告。
    if(process.argv.includes('--approve')) console.log(await suite.research.invoke(new Command({resume:{approve:true}}),config));
    else console.log('审阅后可加 --approve 重新执行并批准；网页支持在原线程审批。');
  }
} finally {await suite.close();}
