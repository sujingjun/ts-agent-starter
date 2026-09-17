import type { ModelPort } from './types.js';
/** 对应第四章 Planner → Executor；用 JSON 数组取代 Python literal，避免跨语言求值。 */
export declare function planAndSolve(model: ModelPort, question: string, options?: {
    maxSteps?: number;
    signal?: AbortSignal;
}): Promise<{
    plan: string[];
    steps: {
        task: string;
        answer: string;
    }[];
    answer: string;
}>;
/** 明确终止：最多 N 次审查。审查不通过也会返回状态，绝不声称无限反思可以保证正确。 */
export declare function reflect(model: ModelPort, task: string, maxRevisions?: number, signal?: AbortSignal): Promise<{
    answer: string;
    reviews: string[];
    approved: boolean;
}>;
