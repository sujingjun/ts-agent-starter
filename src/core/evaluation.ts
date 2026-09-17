import type { RunState, JsonObject } from './types.js';
import { canonical } from './schema.js';
export interface EvalCase {
    id: string;
    input: string;
    expectedTool?: string;
    expectedArguments?: JsonObject;
    expectedText?: string;
    forbiddenTools?: string[];
    expectStatus?: string;
}
export interface EvalScore {
    id: string;
    passed: boolean;
    failures: string[];
    steps: number;
    toolCalls: number;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
}
export function grade(test: EvalCase, run: RunState): EvalScore {
    const failures: string[] = [];
    const calls = run.messages.flatMap(m => m.toolCalls ?? []);
    if (run.status !== (test.expectStatus ?? 'completed'))
        failures.push('运行终态不符合预期');
    if (test.expectedTool && !calls.some(c => c.name === test.expectedTool))
        failures.push('未调用预期工具');
    if (test.expectedArguments && !calls.some(c => (!test.expectedTool || c.name === test.expectedTool) && canonical(c.arguments) === canonical(test.expectedArguments!)))
        failures.push('工具参数不符合预期');
    if (test.expectedText && !run.result?.includes(test.expectedText))
        failures.push('结果缺少预期文字');
    if ((test.forbiddenTools ?? []).some(name => calls.some(c => c.name === name)))
        failures.push('尝试调用禁止工具');
    return { id: test.id, passed: failures.length === 0, failures, steps: run.step, toolCalls: run.toolCalls, inputTokens: run.usage.inputTokens, outputTokens: run.usage.outputTokens, durationMs: run.activeDurationMs };
}
export function aggregate(scores: EvalScore[]) { const n = scores.length; const sorted = scores.map(s => s.durationMs).sort((a, b) => a - b); return { count: n, passed: scores.filter(s => s.passed).length, passRate: n ? scores.filter(s => s.passed).length / n : 0, p95DurationMs: sorted[Math.max(0, Math.ceil(n * 0.95) - 1)] ?? 0, totalTokens: scores.reduce((sum, s) => sum + s.inputTokens + s.outputTokens, 0) }; }
export function tokenF1(prediction: string, reference: string): number {
    const p = [...prediction.replace(/\s/g, '')];
    const r = [...reference.replace(/\s/g, '')];
    if (!p.length && !r.length)
        return 1;
    const counts = new Map<string, number>();
    for (const t of r)
        counts.set(t, (counts.get(t) ?? 0) + 1);
    let overlap = 0;
    for (const t of p)
        if ((counts.get(t) ?? 0) > 0) {
            overlap++;
            counts.set(t, counts.get(t)! - 1);
        }
    return p.length + r.length ? 2 * overlap / (p.length + r.length) : 0;
}
