import{mkdir,readFile}from'node:fs/promises';import{existsSync}from'node:fs';import{resolve}from'node:path';import{execFileSync}from'node:child_process';
const lock=JSON.parse(await readFile('UPSTREAM.lock.json','utf8'));
await mkdir('upstream',{recursive:true});
for(const source of lock.repositories){
  const target=resolve('upstream',source.name);if(existsSync(target))throw new Error(target+' 已存在，为避免覆盖请自行核验');
  const git=(args)=>execFileSync('git',args,{stdio:'inherit',env:{...process.env,GIT_TERMINAL_PROMPT:'0'},timeout:180000});
  git(['init',target]);git(['-C',target,'remote','add','origin',source.url]);git(['-C',target,'fetch','--depth','1','origin',source.commit]);git(['-C',target,'checkout','--detach','FETCH_HEAD']);
  const sha=execFileSync('git',['-C',target,'rev-parse','HEAD'],{encoding:'utf8'}).trim();if(sha!==source.commit)throw new Error('源版本校验失败');
  console.log('已获取原仓库快照（不是 TS 迁移代码）：'+source.name+' @ '+sha);
}
console.log('原始仓库保留其各自许可。脚本不会执行仓库内的安装、构建或 hooks。');
