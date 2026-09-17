import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { ChatGenerationChunk, type ChatResult } from '@langchain/core/outputs';
import { ChatOpenAI } from '@langchain/openai';
import { randomUUID } from 'node:crypto';

type ToolInput = Parameters<NonNullable<BaseChatModel['bindTools']>>[0];
function text(message?: BaseMessage): string {
  return typeof message?.content === 'string' ? message.content : JSON.stringify(message?.content ?? '');
}
function toolName(value: ToolInput[number]): string {
  const t=value as {name?:string; function?: {name?:string}};
  return t.function?.name ?? t.name ?? '';
}
/** 真实 LangChain Runnable + 确定性模型替身；只用于链路演示，不能作为 LLM 质量证明。 */
export class DemoChatModel extends BaseChatModel {
  constructor(private readonly bound: ToolInput = []) { super({}); }
  _llmType() { return 'starter-demo-NOT-LLM'; }
  override bindTools(tools: ToolInput) { return new DemoChatModel(tools); }
  async _generate(messages: BaseMessage[], options: this['ParsedCallOptions']): Promise<ChatResult> {
    options.signal?.throwIfAborted();
    const last=messages.at(-1);
    const people=messages.filter(m=>m.getType()==='human');
    const question=text(people.at(-1));
    const names=this.bound.map(toolName);
    const call=(name:string,args:Record<string,unknown>)=>new AIMessage({content:'',tool_calls:[{id:randomUUID(),name,args,type:'tool_call'}]});
    let message: AIMessage;
    if (last?.getType()==='tool') {
      message=new AIMessage('演示结果（规则模型，不是真实推理）：\n'+text(last));
    } else if (question.startsWith('{"task":"research_report"')) {
      const request=JSON.parse(question) as {query:string;evidence:{id:string;title:string;text:string}[]};
      const name=names.find(n=>!['calculator','search_documents','save_note','read_notes','load_skill'].includes(n));
      if(!name) throw new Error('演示结构化输出缺少响应工具');
      message=call(name,{
        title:'研究报告：'+request.query.slice(0,100),
        summary:'以下为固定资料的结构化汇总，供体验检索、校验与审批流程。',
        claims:request.evidence.slice(0,4).map(e=>({text:e.text.slice(0,600),sourceIds:[e.id]})),
        limitations:['离线演示不进行互联网检索，也不代表真实模型的事实判断能力。'],
      });
    } else if (/记住[：:]/u.test(question) && names.includes('save_note')) {
      message=call('save_note',{title:'用户明确要求保存的笔记',text:question.split(/记住[：:]/u).slice(1).join('：').trim().slice(0,16000)});
    } else if (question.includes('读取笔记') && names.includes('read_notes')) {
      message=call('read_notes',{});
    } else if (question.includes('我刚才问了什么')) {
      message=new AIMessage('上一轮问题：'+text(people.at(-2)));
    } else {
      const expression=question.match(/(?:计算|calculate)\s*([\d.()+\-*/%\s]+)/i)?.[1]?.trim();
      message=expression && names.includes('calculator') ? call('calculator',{expression})
        : names.includes('search_documents') ? call('search_documents',{query:question.slice(0,2000)})
        : new AIMessage('演示模式只验证流程。切换 MODEL_MODE=live 后使用配置的模型。');
    }
    return {generations:[{text:typeof message.content==='string'?message.content:'',message}],llmOutput:{demo:true}};
  }
  async *_streamResponseChunks(messages: BaseMessage[], options: this['ParsedCallOptions']) {
    const result=await this._generate(messages,options);
    const message=result.generations[0]!.message as AIMessage;
    if(message.tool_calls?.length) {
      yield new ChatGenerationChunk({text:'',message:new AIMessageChunk({content:'',tool_call_chunks:message.tool_calls.map((c,index)=>({index,id:c.id!,name:c.name,args:JSON.stringify(c.args),type:'tool_call_chunk' as const}))})});
      return;
    }
    const content=text(message);
    for(let i=0;i<content.length;i+=32) {
      options.signal?.throwIfAborted();
      const fragment=content.slice(i,i+32);
      yield new ChatGenerationChunk({text:fragment,message:new AIMessageChunk({content:fragment})});
    }
  }
}
export function makeChatModel() {
  const mode=process.env['MODEL_MODE'] ?? 'demo';
  if(mode==='demo') return new DemoChatModel();
  if(mode!=='live') throw new Error('MODEL_MODE 必须是 demo 或 live');
  const apiKey=process.env['LLM_API_KEY']; const model=process.env['LLM_MODEL'];
  const baseURL=process.env['LLM_BASE_URL'];
  if(!apiKey || !model || !baseURL) throw new Error('live 模式需要 LLM_API_KEY、LLM_MODEL、LLM_BASE_URL');
  const url=new URL(baseURL);
  const local=process.env['ALLOW_LOCAL_MODEL']==='true' && url.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:'&&!local)||url.username||url.password) throw new Error('模型 URL 必须安全且不得内嵌凭证');
  return new ChatOpenAI({model,apiKey,configuration:{baseURL},maxRetries:1,timeout:30000,streaming:true});
}
