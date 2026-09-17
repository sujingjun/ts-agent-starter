import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const npm=process.platform==='win32'?'npm.cmd':'npm';
function run(command,args){const result=spawnSync(command,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);}
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<16))throw new Error('需要 Node.js 22.16 或更新版本');
run(npm,[existsSync('package-lock.json')?'ci':'install']);
if(!existsSync('.env'))run(process.execPath,['scripts/init-env.mjs']);
run(npm,['run','build']);
run(npm,['run','docs:check']);
console.log('安装和编译完成。执行 npm run dev，浏览器访问终端显示的本地地址。');
