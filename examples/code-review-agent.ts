import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentRunner, MemoryRunStore, ScriptedModel, ToolRegistry, callTurn, finalTurn } from '../src/core/index.js';
import { fileTools } from '../src/infra/file-tools.js';
const root = await mkdtemp(join(tmpdir(), 'agent-review-'));
try {
    const registry = new ToolRegistry();
    for (const tool of fileTools(root))
        registry.register(tool);
    const runner = new AgentRunner({ registry, store: new MemoryRunStore(), model: new ScriptedModel([callTurn('review_diff', { diff: '+ const answer = eval(input);' }), finalTurn('审查完成：新增代码含动态求值，需要替换为白名单操作。此示例是固定测试脚本。')]) });
    const run = await runner.create({ tenantId: 'local', prompt: '审查这段 diff' });
    const result = await runner.execute('local', run.id);
    console.log(JSON.stringify(result.messages, null, 2));
}
finally {
    await rm(root, { recursive: true, force: true });
}
