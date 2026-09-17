import { readdir, readFile, access } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
const roots=['src','apps','integrations','skills','evals','examples','tests','scripts','data','infra'];
const skipped=new Set(['node_modules','dist','dist-core','.nuxt','.output','.git']);
const files=[];const modules=[];
const knownScripts=JSON.parse(await readFile('package.json','utf8')).scripts;
async function walk(dir){const entries=await readdir(dir,{withFileTypes:true});let hasSource=false;
 for(const e of entries){if(skipped.has(e.name))continue;const path=join(dir,e.name);if(e.isDirectory())await walk(path);else{files.push(path);if(/\.(ts|vue|mjs|sql)$/.test(e.name))hasSource=true;}}
 if(hasSource)modules.push(dir);
}
for(const root of roots)await walk(root);
const errors=[];for(const dir of modules){try{await access(join(dir,'README.md'));}catch{errors.push('缺少模块说明：'+dir+'/README.md');}}
const docs=[];async function collect(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await collect(p);else if(e.name.endsWith('.md'))docs.push(p);}}
await collect('docs');for(const f of files.filter(f=>f.endsWith('.md')))docs.push(f);for(const f of ['README.md','QUICKSTART.md','ARCHITECTURE.md','VALIDATION.md'])docs.push(f);
for(const f of new Set(docs)){const text=await readFile(f,'utf8');for(const cmd of text.matchAll(/npm run ([\w:-]+)/g)){if(!(cmd[1] in knownScripts))errors.push(f+' → 未定义命令 npm run '+cmd[1]);}for(const match of text.matchAll(/\]\(([^)]+)\)/g)){const target=match[1].split('#')[0];if(!target||/^(https?:|mailto:|#)/.test(target)||target.includes('<'))continue;try{await access(resolve(dirname(f),decodeURIComponent(target)));}catch{errors.push(f+' → 失效相对链接：'+target);}}}
for(const m of (await readFile('src/features/catalog.ts','utf8')).matchAll(/doc: '([^']+)'/g)){try{await access(m[1]);}catch{errors.push('体验文档缺失：'+m[1]);}}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log(JSON.stringify({modules:modules.length,documents:new Set(docs).size,status:'passed'}));
