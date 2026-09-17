import { ref, computed, onBeforeUnmount } from 'vue';
interface Event {seq:number;type:string;at:string;data:Record<string,unknown>}
interface Run {id:string;threadId:string;engine:'agent'|'research';prompt:string;status:string;events:Event[];interrupts:unknown[];output?:unknown;error?:{message:string};modelCalls:number;toolCalls:number}
interface Experience {id:string;engine:'agent'|'research';title:string;prompt:string;expect:string;skill?:string;doc:string}
interface Capabilities {modelMode:string;checkpointMode:string;processRestart:boolean;experiences:Experience[];skills:{name:string;description:string}[];external:Record<string,unknown>}
export function useStudio() {
  const config=useRuntimeConfig();const token=ref('');const error=ref('');const capabilities=ref<Capabilities>();
  const prompt=ref('计算 (2+3)*4');const engine=ref<'agent'|'research'>('agent');const skill=ref('');
  const run=ref<Run>();const runs=ref<Run[]>([]);const events=ref<Event[]>([]);const busy=ref(false);const history=ref<unknown>();const continueThread=ref(false);
  let connection:AbortController|undefined;
  async function request<T>(path:string,body?:unknown):Promise<T> {
    const res=await fetch(String(config.public.apiBase)+'/api/studio'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token.value,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const data=await res.json();if(!res.ok)throw new Error(data.error?.message??data.message??`HTTP ${res.status}`);return data as T;
  }
  function fail(e:unknown){if(!(e instanceof Error&&e.name==='AbortError'))error.value=e instanceof Error?e.message:String(e);}
  async function refresh(){runs.value=await request<Run[]>('/runs');}
  async function connect(){error.value='';try{capabilities.value=await request<Capabilities>('/capabilities');await refresh();}catch(e){fail(e);}}
  function choose(e:Experience){engine.value=e.engine;prompt.value=e.prompt;skill.value=e.skill??'';continueThread.value=false;}
  async function watch(id:string) {
    connection?.abort();const controller=new AbortController();connection=controller;busy.value=true;
    try {
      // 服务断线后按已落盘序号最多重连三次；不会重新提交模型任务。
      for(let attempt=0;attempt<3;attempt++) {
        const after=events.value.at(-1)?.seq??0;
        const res=await fetch(String(config.public.apiBase)+`/api/studio/runs/${id}/events?after=${after}`,{headers:{Authorization:'Bearer '+token.value},signal:controller.signal});
        if(!res.ok||!res.body)throw new Error('事件连接失败：'+res.status);
        const reader=res.body.getReader();const decoder=new TextDecoder();let buffer='';
        try {
          while(true){const item=await reader.read();if(item.done)break;buffer+=decoder.decode(item.value,{stream:true});let match:RegExpExecArray|null;
            while((match=/\r?\n\r?\n/.exec(buffer))){const block=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);const raw=block.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!raw)continue;const e=JSON.parse(raw) as Event;if(!events.value.some(x=>x.seq===e.seq))events.value.push(e);}
          }
        } finally {reader.releaseLock();}
        run.value=await request<Run>('/runs/'+id);
        if(!['running','queued'].includes(run.value.status))break;
        await new Promise(r=>setTimeout(r,300*(attempt+1)));
      }
      await refresh();
    } finally {if(connection===controller)busy.value=false;}
  }
  async function start(){error.value='';history.value=undefined;try{
    if(!token.value||!prompt.value.trim())throw new Error('先连接服务并输入任务');
    const previousRunId=continueThread.value&&run.value?.status==='completed'&&run.value.engine==='agent'?run.value.id:undefined;
    connection?.abort();events.value=[];
    run.value=await request<Run>('/runs',{engine:engine.value,prompt:prompt.value,...(skill.value?{skill:skill.value}:{}),...(previousRunId?{previousRunId}:{})});
    await watch(run.value.id);
  }catch(e){fail(e);busy.value=false;}}
  async function open(id:string){error.value='';connection?.abort();history.value=undefined;try{run.value=await request<Run>('/runs/'+id);events.value=[...run.value.events];if(['running','queued'].includes(run.value.status))await watch(id);}catch(e){fail(e);}}
  async function action(name:'approve'|'resume'|'cancel',body:unknown={}){if(!run.value)return;error.value='';try{const id=run.value.id;await request('/runs/'+id+'/'+name,body);await watch(id);}catch(e){fail(e);}}
  async function loadHistory(){if(!run.value)return;try{history.value=await request('/runs/'+run.value.id+'/history');}catch(e){fail(e);}}
  async function download(){if(!run.value)return;try{const data=await request('/runs/'+run.value.id+'/artifact');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='research-report.json';a.click();URL.revokeObjectURL(url);}catch(e){fail(e);}}
  const streamedText=computed(()=>events.value.filter(e=>e.type==='model.delta').map(e=>String(e.data.text??'')).join(''));
  const json=(value:unknown)=>JSON.stringify(value,null,2);
  onBeforeUnmount(()=>connection?.abort());
  return {token,error,capabilities,prompt,engine,skill,run,runs,events,busy,history,continueThread,streamedText,json,connect,choose,start,open,action,loadHistory,download};
}
