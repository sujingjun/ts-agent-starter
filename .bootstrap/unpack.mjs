import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { brotliDecompressSync } from 'node:zlib';
const manifest=JSON.parse(await readFile('.bootstrap/manifest.json','utf8'));
const parts=await Promise.all(manifest.parts.map(p=>readFile(p)));
// Repair a detected transfer encoding duplication, then verify the original blob hash.
if (createHash('sha1').update(Buffer.concat([Buffer.from('blob '+parts[1].length+'\0'),parts[1]])).digest('hex')==='40fad3c3fa4194ff1bb4436b9c8b46a9afc036cf') {
 parts[1]=Buffer.from(parts[1].toString('base64').replace('FKLR1LfyLfyLlg','FKLR1LfyLlg').replace(/=+$/,''),'base64');
}
if(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+parts[1].length+'\0'),parts[1]])).digest('hex')!=='ac9e528ea6d74215fb2f11cf50197a511d735c81')throw Error('Part checksum mismatch');
const buffer=Buffer.concat(parts);
if(createHash('sha256').update(buffer).digest('hex')!==manifest.sha256)throw Error('Source payload checksum mismatch');
const files=JSON.parse(brotliDecompressSync(buffer,{maxOutputLength:4000000}).toString('utf8'));
if(Object.keys(files).length!==manifest.files)throw Error('Source file count mismatch');
for(const [path,content] of Object.entries(files)){
 if(typeof content!=='string'||path.includes('\\')||path.includes('\0')||posix.isAbsolute(path)||posix.normalize(path)!==path||path.split('/').some(p=>['..','.git','node_modules','.data','.github'].includes(p))||(path.startsWith('.env')&&path!=='.env.example'))throw Error('Unsafe source path');
 await mkdir(dirname(path),{recursive:true});await writeFile(path,content,'utf8');
}
await mkdir('artifacts/ci',{recursive:true});await writeFile('artifacts/ci/source-import.json',JSON.stringify({sha256:manifest.sha256,files:manifest.files,at:new Date().toISOString()},null,2));
await rm('.bootstrap',{recursive:true});
console.log('Materialized '+manifest.files+' source files; transport payload removed.');
