import assert from'node:assert/strict';if(process.env.NODE_ENV!=='test')process.loadEnvFile('.env');
const base='http://127.0.0.1:'+(process.env.PORT??3001);const token=process.env.API_AUTH_TOKEN;
const request=async(path,body)=>{const res=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(res.ok,true,`${path} HTTP ${res.status}`);return res.json();};
assert.equal((await fetch(base+'/api/runs')).status,401,'未授权请求必须失败');
const created=await request('/api/runs',{prompt:'计算 2+3*4'});let run=created;
for(let i=0;i<100;i++){run=await request('/api/runs/'+created.id);if(['completed','failed'].includes(run.status))break;await new Promise(r=>setTimeout(r,100));}
assert.equal(run.status,'completed');assert.match(run.result,/14/);assert.ok(run.events.length>0);console.log('API 冒烟通过',run.id);
