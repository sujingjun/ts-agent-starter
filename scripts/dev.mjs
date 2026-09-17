import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
const npm=process.platform==='win32'?'npm.cmd':'npm';
if(!existsSync('.env')){const r=spawnSync(process.execPath,['scripts/init-env.mjs'],{stdio:'inherit'});if(r.status)process.exit(r.status);}
const env={...parseEnv(readFileSync('.env','utf8')),...process.env};
if((env.API_AUTH_TOKEN??'').length<32)throw new Error('请设置至少32字符的 API_AUTH_TOKEN');
const build=spawnSync(npm,['run','build:api'],{stdio:'inherit',env});if(build.status)process.exit(build.status);
const children=[];let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');setTimeout(()=>process.exit(code),800).unref();}
function launch(command,args){const child=spawn(command,args,{stdio:'inherit',env});children.push(child);child.on('error',e=>{console.error(e.message);stop(1);});child.on('exit',code=>{if(!stopping)stop(code??1);});return child;}
launch(process.execPath,['apps/api/dist/apps/api/src/main.js']);
let ready=false;
for(let n=0;n<80;n++){if(stopping)break;try{const r=await fetch(`http://127.0.0.1:${env.PORT??3001}/health`);if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
if(!ready){console.error('API 未就绪。查看上方启动错误；不会继续启动空壳网页。');stop(1);}
else{console.log('\n本地访问令牌（只用于此开发服务）：'+env.API_AUTH_TOKEN+'\n网页：http://127.0.0.1:3000\n');launch(npm,['run','dev','--workspace','apps/web']);}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
