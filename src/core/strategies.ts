import type { ModelPort, ModelTurn } from './types.js';
import { bounded } from './async.js';
import { AgentError } from './errors.js';
async function ask(model: ModelPort, system: string, prompt: string, signal?: AbortSignal): Promise<ModelTurn> { return bounded(s => model.complete({ messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], tools: [], signal: s }), 30000, signal); }
/** 对应第四章 Planner → Executor；用 JSON 数组取代 Python literal，避免跨语言求值。 */
export async function planAndSolve(model: ModelPort, question: string, options: {
    maxSteps?: number;
    signal?: AbortSignal;
} = {}): Promise<{
    plan: string[];
    steps: {
        task: string;
        answer: string;
    }[];
    answer: string;
}> {
    const draft = await ask(model, '将问题拆成按顺序执行的子任务。只输出 JSON 字符串数组，不输出 Markdown。', question, options.signal);
    let plan: unknown;
    try {
        plan = JSON.parse(draft.content);
    }
    catch {
        throw new AgentError('PLAN_JSON', '规划不是有效 JSON');
    }
    if (!Array.isArray(plan) || !plan.length || plan.length > (options.maxSteps ?? 6) || !plan.every(s => typeof s === 'string' && s.trim() && s.length <= 1000))
        throw new AgentError('PLAN_SCHEMA', '规划必须是非空、有上限的字符串数组');
    const steps: {
        task: string;
        answer: string;
    }[] = [];
    for (const task of plan as string[]) {
        const turn = await ask(model, '按计划只解决当前子任务，参考已完成的结果；不要伪造外部数据。', JSON.stringify({ question, plan, completed: steps, current: task }), options.signal);
        steps.push({ task, answer: turn.content });
    }
    return { plan, steps, answer: steps.at(-1)!.answer };
}
/** 明确终止：最多 N 次审查。审查不通过也会返回状态，绝不声称无限反思可以保证正确。 */
export async function reflect(model: ModelPort, task: string, maxRevisions = 2, signal?: AbortSignal): Promise<{
    answer: string;
    reviews: string[];
    approved: boolean;
}> {
    if (!Number.isInteger(maxRevisions) || maxRevisions < 0 || maxRevisions > 5)
        throw new AgentError('REVISION_LIMIT', '修订轮次必须介于 0 到 5');
    let answer = (await ask(model, '完成用户任务。', task, signal)).content;
    const reviews: string[] = [];
    for (let i = 0; i <= maxRevisions; i++) {
        const review = await ask(model, '检查任务完成度，只输出 JSON: {"approved":boolean,"feedback":string}。', JSON.stringify({ task, answer }), signal);
        let parsed: unknown;
        try {
            parsed = JSON.parse(review.content);
        }
        catch {
            throw new AgentError('REVIEW_JSON', '审查结构不合法');
        }
        if (!parsed || typeof parsed !== 'object' || typeof (parsed as {
            approved?: unknown;
        }).approved !== 'boolean' || typeof (parsed as {
            feedback?: unknown;
        }).feedback !== 'string')
            throw new AgentError('REVIEW_SCHEMA', '缺少审查字段');
        const result = parsed as {
            approved: boolean;
            feedback: string;
        };
        reviews.push(result.feedback);
        if (result.approved)
            return { answer, reviews, approved: true };
        if (i < maxRevisions)
            answer = (await ask(model, '根据具体反馈修订，不更改用户任务。', JSON.stringify({ task, answer, feedback: result.feedback }), signal)).content;
    }
    return { answer, reviews, approved: false };
}
