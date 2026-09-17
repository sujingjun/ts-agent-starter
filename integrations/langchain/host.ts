import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import { invariant, AgentError } from '../../src/core/errors.js';
import { EXPERIENCE_CATALOG } from '../../src/features/catalog.js';
import { makeSuite } from './suite.js';
import type { ToolServices } from './tools.js';

type Engine='agent'|'research';
type Status='queued'|'running'|'waiting_approval'|'completed'|'failed'|'cancelled';
export interface StudioEvent { seq:number; type:string; at:string; data:Record<string,unknown> }
export interface StudioRun {
  id:string; threadId:string; tenantId:string; engine:Engine; prompt:string; skill?:string;
  status:Status; createdAt:string; updatedAt:string; events:StudioEvent[];
  output?:unknown; interrupts:unknown[]; error?:{code:string;message:string};
  modelCalls:number; toolCalls:number;
}
interface Snapshot { values:Record<string,unknown>; next:readonly string[]; tasks:{interrupts?:{id?:string;value:unknown}[]}[]; config:RunnableConfig; createdAt?:string; metadata?:unknown }
interface FrameworkEvent { event:string; name:string; metadata?:Record<string,unknown>; data:Record<string,unknown> }
/** 框架类型在此边界投影，不让 checkpoint 内部实现泄漏到 NestJS 或浏览器。 */
interface GraphPort {
  streamEvents(input:unknown,config:RunnableConfig & {version:'v2'}):AsyncIterable<FrameworkEvent>;
  getState(config:RunnableConfig):Promise<Snapshot>;
  getStateHistory(config:RunnableConfig):AsyncIterable<Snapshot>;
}
function messageText(value:unknown):string {
  if(typeof value==='string') return value;
  if(Array.isArray(value)) return value.map(v=>typeof v==='object'&&v!==null&&'text' in v?String(v.text):'').join('');
  return '';
}
function safeError(error:unknown) {
  let message=error instanceof Error?error.message:'执行失败';
  for(const name of ['LLM_API_KEY','API_AUTH_TOKEN','LANGSMITH_API_KEY','TAVILY_API_KEY','DATABASE_URL']) {
    const secret=process.env[name]; if(secret) message=message.split(secret).join('[已隐藏]');
  }
  return {code:'EXECUTION_FAILED',message:message.slice(0,500)};
}
export class StudioHost {
  private readonly active=new Map<string,AbortController>();
  private readonly occupied=new Set<string>();
  private readonly tasks=new Set<Promise<void>>();
  private readonly dir:string;
  private readonly suite:Awaited<ReturnType<typeof makeSuite>>;
  private constructor(private readonly services:ToolServices,private readonly root:string,suite:Awaited<ReturnType<typeof makeSuite>>) {
    this.suite=suite; this.dir=resolve(root,'.data/studio',createHash('sha256').update(services.tenantId).digest('hex'));
  }
  static async create(services:ToolServices,root:string) { const host=new StudioHost(services,root,await makeSuite(services,root)); await mkdir(host.dir,{recursive:true,mode:0o700}); return host; }
  private graph(engine:Engine):GraphPort { return (engine==='agent'?this.suite.agent:this.suite.research) as unknown as GraphPort; }
  private config(run:StudioRun,signal?:AbortSignal):RunnableConfig {
    return {configurable:{thread_id:run.threadId},recursionLimit:40,...(signal?{signal}:{})};
  }
  private path(id:string) { invariant(/^[a-f0-9-]{36}$/.test(id),'RUN_ID','运行 ID 不合法'); return resolve(this.dir,id+'.json'); }
  private async save(run:StudioRun) {
    run.updatedAt=new Date().toISOString(); const path=this.path(run.id); const tmp=path+'.'+randomUUID()+'.tmp';
    await writeFile(tmp,JSON.stringify(run),{mode:0o600}); await rename(tmp,path);
  }
  async get(id:string):Promise<StudioRun> {
    let row:StudioRun;
    try {row=JSON.parse(await readFile(this.path(id),'utf8')) as StudioRun;}
    catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT') throw new AgentError('NOT_FOUND','运行不存在'); throw e;}
    invariant(row.tenantId===this.services.tenantId&&row.id===id,'RUN_IDENTITY','运行身份不匹配'); return row;
  }
  async list() {
    const rows:StudioRun[]=[];
    for(const file of await readdir(this.dir)) if(/^[a-f0-9-]{36}\.json$/.test(file)) rows.push(await this.get(file.slice(0,-5)));
    return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100).map(({events,output,interrupts,...r})=>({...r,eventCount:events.length}));
  }
  capabilities() {
    return {version:'0.2.0',modelMode:process.env['MODEL_MODE']??'demo',checkpointMode:this.suite.checkpointMode,
      processRestart:this.suite.checkpointMode==='postgres',scope:'single-local-tenant-single-api-process',
      experiences:EXPERIENCE_CATALOG,skills:this.services.skills.metadata(),
      external:{postgres:Boolean(process.env['DATABASE_URL']),browser:'npm run test:browser',mcp:'npm run test:mcp',sandbox:process.env['ENABLE_SANDBOX']==='true',webSearch:Boolean(process.env['TAVILY_API_KEY']),langsmith:process.env['LANGSMITH_TRACING']==='true'},
    };
  }
  private reserve(threadId:string) {invariant(!this.occupied.has(threadId),'RUN_BUSY','同一会话已有运行或审批处理');this.occupied.add(threadId);}
  private async event(run:StudioRun,type:string,data:Record<string,unknown>={}) {
    invariant(run.events.length<3000,'TRACE_LIMIT','事件数量超出单次任务上限');
    run.events.push({seq:run.events.length+1,type,at:new Date().toISOString(),data}); await this.save(run);
  }
  async create(input:{engine:Engine;prompt:string;skill?:string;previousRunId?:string}) {
    let threadId=this.services.tenantId+':'+input.engine+':'+randomUUID();
    if(input.previousRunId) {
      const old=await this.get(input.previousRunId);
      invariant(input.engine==='agent'&&old.engine==='agent'&&old.status==='completed','THREAD_STATE','仅对已完成的标准 Agent 会话继续对话');
      threadId=old.threadId;
      const snap=await this.graph('agent').getState(this.config(old));
      invariant(Array.isArray(snap.values['messages']),'CHECKPOINT_LOST','当前进程找不到会话状态；memory 模式重启后需要新建会话');
    }
    const skill=input.skill?this.services.skills.load(input.skill):undefined;
    const now=new Date().toISOString();
    const run:StudioRun={id:randomUUID(),threadId,tenantId:this.services.tenantId,engine:input.engine,prompt:input.prompt,status:'queued',createdAt:now,updatedAt:now,events:[],interrupts:[],modelCalls:0,toolCalls:0,...(input.skill?{skill:input.skill}:{})};
    this.reserve(threadId);
    try {await this.save(run);}
    catch(e){this.occupied.delete(threadId);throw e;}
    const content=input.prompt+(skill?'\n\n本次选择的流程知识（不代表权限）：\n'+skill.body:'');
    this.dispatch(run,input.engine==='agent'?{messages:[{role:'user',content}]}:{query:input.prompt});
    return run;
  }
  private dispatch(run:StudioRun,input:unknown) {
    const controller=new AbortController(); this.active.set(run.id,controller);
    const task=this.execute(run,input,AbortSignal.any([controller.signal,AbortSignal.timeout(120000)]))
      .catch(e=>{console.error('studio.persist.failed',safeError(e));})
      .finally(()=>{this.active.delete(run.id);this.occupied.delete(run.threadId);this.tasks.delete(task);});
    this.tasks.add(task);
  }
  private async execute(run:StudioRun,input:unknown,signal:AbortSignal) {
    try {
      run.status='running'; run.interrupts=[]; delete run.error;
      await this.event(run,'run.started',{engine:run.engine,modelMode:process.env['MODEL_MODE']??'demo'});
      const graph=this.graph(run.engine);
      const stream=graph.streamEvents(input,{...this.config(run,signal),version:'v2'});
      for await(const event of stream) {
        signal.throwIfAborted();
        if(event.event==='on_chat_model_start') {run.modelCalls++;await this.event(run,'model.started',{name:event.name});}
        if(event.event==='on_chat_model_stream') {
          const chunk=event.data['chunk'] as {content?:unknown}|undefined;
          const delta=messageText(chunk?.content); if(delta) await this.event(run,'model.delta',{text:delta.slice(0,2000)});
        }
        if(event.event==='on_tool_start') {run.toolCalls++;await this.event(run,'tool.started',{name:event.name,input:event.data['input']});}
        if(event.event==='on_tool_end') await this.event(run,'tool.completed',{name:event.name});
        if(event.event==='on_chain_start'&&event.metadata?.['langgraph_node']===event.name) await this.event(run,'node.started',{name:event.name});
      }
      const snapshot=await graph.getState(this.config(run));
      run.interrupts=snapshot.tasks.flatMap(t=>(t.interrupts??[]).map(i=>({id:i.id,value:i.value})));
      run.status=run.interrupts.length?'waiting_approval':'completed';
      if(run.engine==='agent') {
        const messages=snapshot.values['messages'] as {content?:unknown}[]|undefined;
        run.output={text:messageText(messages?.at(-1)?.content)};
      } else run.output={report:snapshot.values['report'],evidence:snapshot.values['evidence'],outcome:snapshot.values['outcome'],artifactId:snapshot.values['artifactId'],issues:snapshot.values['issues'],plan:snapshot.values['plan']};
      await this.event(run,run.status==='waiting_approval'?'approval.required':'run.completed',{interrupts:run.interrupts});
    } catch(e) {
      run.status=signal.aborted?(signal.reason?.name==='TimeoutError'?'failed':'cancelled'):'failed';
      run.error=safeError(e); await this.save(run);
      // 错误终态仍保存，但不得因轨迹上限再次抛出而丢失失败原因。
      if(run.events.length<3000) await this.event(run,'run.'+run.status,{error:run.error});
    }
  }
  async approve(id:string,allow:boolean) {
    const run=await this.get(id);
    invariant(run.status==='waiting_approval','APPROVAL_STATE','当前运行不等待审批');
    this.reserve(run.threadId);
    try {
      const snapshot=await this.graph(run.engine).getState(this.config(run));
      const pending=snapshot.tasks.flatMap(t=>t.interrupts??[]);
      invariant(pending.length===1,'APPROVAL_CHECKPOINT','审批检查点缺失或不唯一；不能自动扩大授权');
      let resume:unknown={approve:allow};
      if(run.engine==='agent') {
        const payload=pending[0]!.value as {actionRequests?:unknown[]};
        invariant(Array.isArray(payload.actionRequests)&&payload.actionRequests.length>0,'APPROVAL_PAYLOAD','缺少具体工具调用');
        resume={decisions:payload.actionRequests.map(()=>allow?{type:'approve'}:{type:'reject',message:'用户拒绝本次调用'})};
      }
      run.status='queued';await this.event(run,'approval.resolved',{allow});
      this.dispatch(run,new Command({resume})); return run;
    } catch(e){this.occupied.delete(run.threadId);throw e;}
  }
  async resume(id:string) {
    const run=await this.get(id);
    invariant(['running','queued','failed'].includes(run.status),'RESUME_STATE','等待审批请走审批接口；完成或取消不能重放');
    this.reserve(run.threadId);
    try {
      const snapshot=await this.graph(run.engine).getState(this.config(run));
      invariant(snapshot.next.length>0,'CHECKPOINT_LOST','没有可恢复检查点；memory 模式不能跨进程恢复');
      invariant(!snapshot.tasks.some(t=>t.interrupts?.length),'APPROVAL_STATE','检查点等待审批，不能使用普通恢复');
      this.dispatch(run,null);return run;
    } catch(e){this.occupied.delete(run.threadId);throw e;}
  }
  async cancel(id:string) {
    const run=await this.get(id);
    invariant(!['completed','cancelled'].includes(run.status),'CANCEL_STATE','已完成或取消的运行不能再次取消');
    const controller=this.active.get(id);
    if(controller) controller.abort(new Error('用户取消'));
    else {invariant(!this.occupied.has(run.threadId),'RUN_BUSY','会话正在恢复');run.status='cancelled';await this.event(run,'run.cancelled');}
    return {id,status:controller?'cancelling':'cancelled'};
  }
  async history(id:string) {
    const run=await this.get(id);const rows=[];
    for await(const snapshot of this.graph(run.engine).getStateHistory(this.config(run))) {
      rows.push({createdAt:snapshot.createdAt,next:snapshot.next,checkpointId:snapshot.config.configurable?.['checkpoint_id'],metadata:snapshot.metadata});
      if(rows.length>=30) break;
    }
    return {checkpointMode:this.suite.checkpointMode,rows};
  }
  async artifact(id:string) {
    const run=await this.get(id);const output=run.output as {artifactId?:string;outcome?:string}|undefined;
    invariant(run.status==='completed'&&output?.outcome==='exported'&&/^[a-f0-9]{64}$/.test(output.artifactId??''),'ARTIFACT_STATE','该运行没有已批准的报告产物');
    const path=resolve(this.root,'.data/reports',createHash('sha256').update(this.services.tenantId).digest('hex'),output.artifactId+'.json');
    return JSON.parse(await readFile(path,'utf8')) as unknown;
  }
  async onModuleDestroy() {for(const c of this.active.values()) c.abort();await Promise.allSettled(this.tasks);await this.suite.close();}
}
