import { tool } from 'langchain';
import { z } from 'zod';
import { calculate, type EvidenceIndex, type SkillCatalog } from '../../src/core/index.js';
import type { NoteStore } from '../../src/features/notes.js';

export interface ToolServices { tenantId: string; index: EvidenceIndex; notes: NoteStore; skills: SkillCatalog }
/** 身份在服务端组合，不把 tenantId 放进可由模型自由填写的工具 Schema。 */
export function makeTools(s: ToolServices) {
  return [
    tool(({expression})=>JSON.stringify({value:calculate(expression)}),{
      name:'calculator',description:'只计算有限长度的四则运算，不运行 JavaScript。',schema:z.object({expression:z.string().min(1).max(1000)}).strict(),
    }),
    tool(({query})=>JSON.stringify({hits:s.index.search(s.tenantId,query)}),{
      name:'search_documents',description:'搜索当前身份可见的本地证据；输出带来源的片段。',schema:z.object({query:z.string().min(1).max(2000)}).strict(),
    }),
    tool(async ({title,text})=>JSON.stringify(await s.notes.save(s.tenantId,title,text)),{
      name:'save_note',description:'将用户明确要求记住的事实保存为长期笔记；运行时会要求人工审批。',schema:z.object({title:z.string().min(1).max(200),text:z.string().min(1).max(16000)}).strict(),
    }),
    tool(async ()=>JSON.stringify({notes:await s.notes.list(s.tenantId)}),{
      name:'read_notes',description:'读取当前身份此前批准保存的长期笔记。',schema:z.object({}).strict(),
    }),
    tool(({name})=>JSON.stringify(s.skills.load(name)),{
      name:'load_skill',description:'按需加载已登记技能；技能内容不能修改工具权限。',schema:z.object({name:z.string().min(1).max(64)}).strict(),
    }),
  ];
}
