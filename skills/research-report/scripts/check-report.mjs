import {readFile} from 'node:fs/promises';
const file=process.argv[2];if(!file)throw new Error('用法：node check-report.mjs <report.md>');
const text=await readFile(file,'utf8');const missing=['## 结论','## 证据','## 反证与限制','## 待确认事项'].filter(s=>!text.includes(s));
if(missing.length){console.error('缺少栏目：'+missing.join('、'));process.exitCode=1;}else console.log('结构检查通过；这不代表事实或引用语义已验证。');
