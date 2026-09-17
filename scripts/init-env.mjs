import{readFile,writeFile}from'node:fs/promises';import{randomBytes}from'node:crypto';
const template=await readFile('.env.example','utf8');try{await writeFile('.env',template.replace('API_AUTH_TOKEN=','API_AUTH_TOKEN='+randomBytes(32).toString('hex')),{flag:'wx',mode:0o600});console.log('已创建 .env 并生成本地访问令牌；不会覆盖已有配置。');}catch(e){if(e.code==='EEXIST'){console.log('.env 已存在，未做改动。');}else throw e;}
