import assert from 'node:assert/strict';
const base=process.env.API_BASE??'http://127.0.0.1:3001';
if(process.env.MODEL_MODE&&process.env.MODEL_MODE!=='demo')throw new Error('体验回归仅允许 demo；不自动消耗真实模型额度');
if(!process.env.API_AUTH_TOKEN)throw new Error('缺少 API_AUTH_TOKEN，请通过 --env-file=.env 启动');
async function api(path,body){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+process.env.API_AUTH_TOKEN,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json();assert.equal(r.ok,true,JSON.stringify(data));return data;}
async function wait(id){for(let n=0;n<150;n++){const r=await api('/api/studio/runs/'+id);if(!['queued','running'].includes(r.status))return r;await new Promise(r=>setTimeout(r,100));}throw new Error('等待任务超时');}
const unauthorized=await fetch(base+'/api/studio/capabilities');assert.equal(unauthorized.status,401);
const cap=await api('/api/studio/capabilities');assert.equal(cap.modelMode,'demo');
let run=await api('/api/studio/runs',{engine:'agent',prompt:'计算 (2+3)*4'});run=await wait(run.id);assert.equal(run.status,'completed');assert.match(run.output.text,/20/);
const conversation=await api('/api/studio/runs',{engine:'agent',prompt:'我刚才问了什么',previousRunId:run.id});assert.match((await wait(conversation.id)).output.text,/\(2\+3\)\*4/);
let remember=await api('/api/studio/runs',{engine:'agent',prompt:'记住：体验回归测试'});remember=await wait(remember.id);assert.equal(remember.status,'waiting_approval');
await api('/api/studio/runs/'+remember.id+'/approve',{allow:false});assert.equal((await wait(remember.id)).status,'completed');
let graph=await api('/api/studio/runs',{engine:'research',prompt:'MCP 工具与人工审批'});graph=await wait(graph.id);assert.equal(graph.status,'waiting_approval');
await api('/api/studio/runs/'+graph.id+'/approve',{allow:true});graph=await wait(graph.id);assert.equal(graph.output.outcome,'exported');
const artifact=await api('/api/studio/runs/'+graph.id+'/artifact');assert.ok(artifact.claims.length);
const history=await api('/api/studio/runs/'+graph.id+'/history');assert.ok(history.rows.length>=5);
const events=await fetch(base+'/api/studio/runs/'+graph.id+'/events',{headers:{Authorization:'Bearer '+process.env.API_AUTH_TOKEN}});assert.equal(events.status,200);assert.match(await events.text(),/run.completed/);
console.log(JSON.stringify({passed:true,checks:['authentication','tool-loop','thread-memory','approval-reject','parallel-research','structured-report','approval-approve','artifact','history','sse']},null,2));
