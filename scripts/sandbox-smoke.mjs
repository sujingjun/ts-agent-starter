import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { sandboxTestTool } from '../dist-core/src/infra/sandbox.js';

// Only a new, disposable test directory is mounted. No source repo or credentials enter Docker.
const root=await mkdtemp(join(tmpdir(),'starter-sandbox-'));
try {
 await chmod(root,0o755);
 await writeFile(join(root,'boundary.test.mjs'),`
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
test('non-root, no host credentials',()=>{
 assert.equal(process.getuid(),65534);
 assert.equal(process.env.API_AUTH_TOKEN,undefined);
 assert.equal(process.env.GITHUB_TOKEN,undefined);
 assert.equal(process.env.LLM_API_KEY,undefined);
});
test('workspace mount is read-only',async()=>{
 const mounts=await readFile('/proc/mounts','utf8');
 const workspace=mounts.split('\\n').find(line=>line.split(' ')[1]==='/workspace');
 assert.ok(workspace?.split(' ')[3]?.split(',').includes('ro'));
 await assert.rejects(writeFile('/workspace/not-allowed.txt','blocked'));
});
test('no non-loopback network interface',()=>{
 const addresses=Object.values(networkInterfaces()).flat().filter(Boolean);
 assert.ok(addresses.every(address=>address.internal));
});
`,{mode:0o644});
 const tool=sandboxTestTool(root);
 const result=await tool.execute({}, {runId:'sandbox-smoke',sessionId:'sandbox-smoke',tenantId:'ci',idempotencyKey:randomBytes(24).toString('hex'),signal:AbortSignal.timeout(45000)});
 assert.ok(result&&typeof result==='object'&&!Array.isArray(result));
 assert.equal(result.exitCode,0,JSON.stringify(result));
 assert.match(String(result.stdout),/# pass 3/);
 console.log(JSON.stringify({passed:true,checks:['non-root-and-no-host-credentials','read-only-workspace','network-none'],output:result.stdout},null,2));
} finally {await rm(root,{recursive:true,force:true});}
