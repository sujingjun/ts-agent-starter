import { createServer, type IncomingMessage } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createRuntime } from '../../src/runtime.js';
import { FileRunStore, objectInput, validate, s } from '../../src/core/index.js';
import { resolve } from 'node:path';
/** 无第三方依赖的教学入口。它不是 LangChain / NestJS，也不替代主体验台。 */
const token = process.env['API_AUTH_TOKEN'] || randomBytes(32).toString('hex');
if(token.length<32) throw new Error('API_AUTH_TOKEN 至少32字符');
const runtime = await createRuntime({store:new FileRunStore(resolve('.data/playground'))});
const tenant = process.env['LOCAL_TENANT_ID'] || 'local';
const page = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TS Agent 离线教学台</title>
<style>body{font:16px/1.6 system-ui;max-width:960px;margin:40px auto;padding:20px;background:#f4f6fa;color:#172136}input,textarea,button{font:inherit;padding:10px;margin:6px 0}input,textarea{box-sizing:border-box;width:100%}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;border:1px solid #ddd;padding:20px}button{cursor:pointer}</style>
<h1>TS Agent 离线教学台</h1><p>当前入口直接运行原生 TS 核心，不加载 LangChain、LangGraph 或 NestJS。主体验台请执行 npm run setup 与 npm run dev。</p>
<label>终端中的本地令牌<input id="token" type="password" autocomplete="off"></label>
<select id="example"><option>计算 (2+3)*4</option><option>MCP 工具</option><option>记住：我正在学习 TypeScript Agent</option><option>读取笔记</option></select>
<textarea id="prompt" rows="3">计算 (2+3)*4</textarea><button id="start">执行</button><button id="yes" hidden>批准当前工具</button><button id="no" hidden>拒绝当前工具</button><p id="status">未开始</p><pre id="out">模型默认是明确标注的规则演示器。</pre>
<script>
let state; const el=id=>document.getElementById(id);el('example').onchange=()=>el('prompt').value=el('example').value;
async function call(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+el('token').value},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.error||r.status);return j;}
function show(s){state=s;el('status').textContent=s.status;el('out').textContent=JSON.stringify(s,null,2);el('yes').hidden=el('no').hidden=s.status!=='waiting_approval';}
async function act(fn){el('start').disabled=true;try{show(await fn());}catch(e){el('status').textContent=e.message;}finally{el('start').disabled=false;}}
el('start').onclick=()=>act(()=>call('/run',{prompt:el('prompt').value}));
for(const [id,allow]of [['yes',true],['no',false]])el(id).onclick=()=>act(()=>call('/approve',{runId:state.id,callId:state.pending.find(c=>c.phase==='pending').call.id,allow}));
</script></html>`;
async function body(req:IncomingMessage):Promise<unknown>{let value='';for await(const chunk of req){value+=String(chunk);if(Buffer.byteLength(value)>32768)throw new Error('请求过大');}return JSON.parse(value);}
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(page);return;}
  const auth=Buffer.from(req.headers.authorization??''),expected=Buffer.from('Bearer '+token);
  if(auth.length!==expected.length||!timingSafeEqual(auth,expected)){res.writeHead(401);res.end(JSON.stringify({error:'未授权'}));return;}
  res.setHeader('Content-Type','application/json;charset=utf-8');
  try {
    if(req.method!=='POST')throw new Error('仅支持 POST');
    const input=objectInput(await body(req));
    if(req.url==='/run'){
      validate(s.object({prompt:{type:'string',minLength:1,maxLength:16000}}),input);
      const state=await runtime.runner.create({tenantId:tenant,prompt:input['prompt'] as string});
      const result=await runtime.runner.execute(tenant,state.id);
      res.end(JSON.stringify(result));
    }else if(req.url==='/approve'){
      validate(s.object({runId:s.string(36),callId:s.string(200),allow:{type:'boolean'}}),input);
      await runtime.runner.approve(tenant,input['runId'] as string,input['callId'] as string,input['allow'] as boolean);
      res.end(JSON.stringify(await runtime.runner.execute(tenant,input['runId'] as string)));
    }else{res.writeHead(404);res.end(JSON.stringify({error:'不存在'}));}
  }catch(e){res.writeHead(400);res.end(JSON.stringify({error:e instanceof Error?e.message:'请求失败'}));}
});
const port=Number(process.env['PLAYGROUND_PORT']??3010);
server.listen(port,'127.0.0.1',()=>console.log('离线教学台 http://127.0.0.1:'+port+'\n本地令牌：'+token));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close());
