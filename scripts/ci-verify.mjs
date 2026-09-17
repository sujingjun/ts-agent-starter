import { mkdir, writeFile, open } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
const dir='artifacts/ci';await mkdir(dir,{recursive:true});
const statuses={};const servers=[];
function stage(name,cmd,args,timeout=240000){
  const r=spawnSync(cmd,args,{encoding:'utf8',timeout,maxBuffer:20*1024*1024,env:process.env});
  const output=(r.stdout??'')+(r.stderr??'')+(r.error?'\n'+r.error.message:'');
  statuses[name]=r.status===0?'passed':'failed';
  return writeFile(`${dir}/${name}.log`,output).then(()=>{console.log(`${name}: ${statuses[name]}`);console.log(output.slice(-5000));return r.status===0;});
}
async function serve(name,args,extra={}){
  const log=await open(`${dir}/${name}.log`,'w');
  const child=spawn('node',args,{env:{...process.env,...extra},stdio:['ignore',log.fd,log.fd]});
  child.on('error',e=>console.error(name,e.message));servers.push({child,log});
}
async function ready(){
 for(let i=0;i<60;i++){
  try{const [a,b]=await Promise.all([fetch('http://127.0.0.1:3001/health',{signal:AbortSignal.timeout(1000)}),fetch('http://127.0.0.1:3000',{signal:AbortSignal.timeout(1000)})]);if(a.ok&&b.ok)return true;}catch{}
  await new Promise(r=>setTimeout(r,1000));
 }
 return false;
}
try{
 const installed=await stage('install','npm',[existsSync('package-lock.json')?'ci':'install'],480000);
 if(installed){
  await stage('core','npm',['run','test:core']);
  const pulled=await stage('sandbox-image','docker',['pull','node:22-bookworm-slim'],180000);
  if(pulled)await stage('sandbox','npm',['run','test:sandbox']);
  const api=await stage('api-build','npm',['run','build:api']);
  if(api){await stage('framework','npm',['run','test:framework']);await stage('api-tests','npm',['run','test:api']);}
  await stage('eval','npm',['run','eval']);await stage('docs','npm',['run','docs:check']);
  const web=await stage('web-build','npm',['run','build:web']);
  await stage('web-types','npm',['run','typecheck:web']);
  await stage('mcp','npm',['run','test:mcp']);
  if(api)await stage('postgres','npm',['run','test:postgres']);
  if(api&&web){
   await stage('init-env','node',['scripts/init-env.mjs']);
   await serve('api-runtime',['--env-file=.env','apps/api/dist/apps/api/src/main.js']);
   await serve('web-runtime',['apps/web/.output/server/index.mjs'],{HOST:'127.0.0.1',PORT:'3000',NUXT_PUBLIC_API_BASE:'http://127.0.0.1:3001'});
   const browser=await stage('playwright','npx',['playwright','install','--with-deps','chromium'],300000);
   if(browser)await stage('browser-tool','npm',['run','demo:browser']);
   statuses.servers=await ready()?'passed':'failed';
   if(statuses.servers==='passed'){
    await stage('http','npm',['run','test:experience']);
    if(browser)await stage('browser','node',['--env-file=.env','scripts/browser-smoke.mjs']);
   }
  }
 }
}catch(e){statuses.runner='failed';await writeFile(`${dir}/runner.log`,String(e.stack??e));}
finally{
 for(const {child,log} of servers){child.kill('SIGTERM');await log.close();}
 const report={at:new Date().toISOString(),node:process.version,workflowRun:process.env.GITHUB_RUN_ID,sourceCommit:process.env.GITHUB_SHA,mode:'demo-no-provider-key',statuses};
 await writeFile('REMOTE-VALIDATION.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
const required=['install','core','api-build','framework','api-tests','eval','docs','web-build','web-types','mcp','postgres','playwright','servers','http','browser','browser-tool','sandbox-image','sandbox'];
if(required.some(k=>statuses[k]!=='passed'))process.exitCode=1;
