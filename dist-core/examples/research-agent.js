import { createRuntime } from '../src/runtime.js';
import { verifyCitations } from '../src/core/rag.js';
const { runner, index } = await createRuntime({ enableExternal: true });
const question = process.argv.slice(2).join(' ') || 'MCP 工具授权';
const tenant = 'local';
const run = await runner.create({ tenantId: tenant, prompt: question });
const result = await runner.execute(tenant, run.id);
const allowed = new Set(index.search(tenant, question).map(h => h.id));
console.log(JSON.stringify({ status: result.status, answer: result.result, citations: verifyCitations(result.result ?? '', allowed), note: '引用 ID 有效不等于语义被证据支持，后者需人工或评测器核查' }, null, 2));
//# sourceMappingURL=research-agent.js.map