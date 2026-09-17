import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRuntime } from '../src/runtime.js';
import { grade, aggregate } from '../src/core/evaluation.js';
import type { EvalCase, EvalScore } from '../src/core/evaluation.js';
import { MemoryRunStore } from '../src/core/stores.js';
// 固定离线模式，防止回归测试意外消费在线模型或执行外部动作。
process.env['MODEL_MODE'] = 'demo';
delete process.env['WORKSPACE_ROOT'];
const root = process.cwd();
const { runner } = await createRuntime({ root, store: new MemoryRunStore(), enableExternal: false });
const raw = await readFile(resolve(root, 'evals/datasets/offline-regression.jsonl'), 'utf8');
const cases: EvalCase[] = raw.trim().split(/\r?\n/).map(line => JSON.parse(line) as EvalCase);
const scores: EvalScore[] = [];
for (const item of cases) {
    const run = await runner.create({ tenantId: 'local', prompt: item.input });
    scores.push(grade(item, await runner.execute('local', run.id)));
}
const summary = aggregate(scores);
const report = { mode: 'deterministic-offline-fixture', model: 'DemoModel (NOT an LLM)', generatedAt: new Date().toISOString(), warning: '此通过率仅验证确定性回归，不是模型能力、BFCL、GAIA 或上游行为等价结论。', summary, scores };
await mkdir(resolve(root, 'artifacts/evaluation'), { recursive: true });
await writeFile(resolve(root, 'artifacts/evaluation/offline-report.json'), JSON.stringify(report, null, 2) + '\n');
const md = ['# 离线回归结果', '', report.warning, '', `通过 ${summary.passed}/${summary.count}；P95 ${summary.p95DurationMs}ms（当前容器单次执行，仅供定位，不是性能承诺）。`, '', '| 用例 | 结果 | 失败原因 |', '|---|---|---|', ...scores.map(s => `| ${s.id} | ${s.passed ? '通过' : '失败'} | ${s.failures.join('；') || '—'} |`), ''].join('\n');
await writeFile(resolve(root, 'artifacts/evaluation/offline-report.md'), md);
console.log(JSON.stringify(report.summary, null, 2));
if (scores.some(s => !s.passed))
    process.exitCode = 1;
