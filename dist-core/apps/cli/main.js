import { createRuntime } from '../../src/runtime.js';
const runtime = await createRuntime({ enableExternal: true });
const args = process.argv.slice(2);
const command = args[0] ?? 'ask';
const tenant = process.env['LOCAL_TENANT_ID'] ?? 'local';
if (command === 'ask') {
    const question = args.slice(1).join(' ') || '解释 MCP 与工具授权';
    const run = await runtime.runner.create({ tenantId: tenant, prompt: question });
    const result = await runtime.runner.execute(tenant, run.id, { observer: e => console.error(`[${e.seq}] ${e.type}`) });
    console.log(JSON.stringify({ id: result.id, status: result.status, result: result.result, error: result.error }, null, 2));
    if (result.status === 'failed')
        process.exitCode = 1;
}
else if (command === 'resume') {
    const id = args[1];
    if (!id)
        throw new Error('用法：resume <runId>');
    console.log(JSON.stringify(await runtime.runner.execute(tenant, id), null, 2));
}
else if (command === 'approve') {
    const [, id, callId, decision] = args;
    if (!id || !callId || !['allow', 'deny'].includes(decision ?? ''))
        throw new Error('用法：approve <runId> <callId> allow|deny；必须启用 STORE_MODE=file');
    await runtime.runner.approve(tenant, id, callId, decision === 'allow');
    console.log(JSON.stringify(await runtime.runner.execute(tenant, id), null, 2));
}
else if (command === 'list')
    console.log(JSON.stringify(await runtime.store.list(tenant), null, 2));
else
    throw new Error('支持命令：ask、resume、approve、list');
//# sourceMappingURL=main.js.map