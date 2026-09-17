import{readFile,stat}from'node:fs/promises';import{createHash}from'node:crypto';
const manifest=JSON.parse(await readFile('FILE-MANIFEST.json','utf8'));let invalid=0;
for(const file of manifest.files){try{const data=await readFile(file.path);if(createHash('sha256').update(data).digest('hex')!==file.sha256){console.error('内容不匹配',file.path);invalid++;}}catch{console.error('缺少文件',file.path);invalid++;}}
console.log(JSON.stringify({checked:manifest.files.length,invalid,note:'文件哈希仅证明交付完整性，不证明与 Python 原作功能等价。'},null,2));process.exitCode=invalid?1:0;
