import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';import { createHash } from 'node:crypto';
const skip=new Set(['.git','node_modules','.data','.nuxt','.output','dist','dist-core','artifacts','.bootstrap','upstream']);
const files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(skip.has(e.name)||e.isSymbolicLink())continue;const path=join(dir,e.name);if(e.isDirectory())await walk(path);else if(!['FILE-MANIFEST.json','package-lock.json','REMOTE-VALIDATION.json'].includes(e.name)&&(!e.name.startsWith('.env')||e.name==='.env.example')&&!/\.log$/.test(e.name)){const data=await readFile(path);files.push({path:path.replaceAll('\\','/'),sha256:createHash('sha256').update(data).digest('hex')});}}}
await walk('.');files.sort((a,b)=>a.path.localeCompare(b.path));await writeFile('FILE-MANIFEST.json',JSON.stringify({version:'0.2.0',scope:'source-and-docs; generated output and dependency lock excluded',files},null,2)+'\n');
console.log('已生成源码及文档校验清单：'+files.length+' 文件');
