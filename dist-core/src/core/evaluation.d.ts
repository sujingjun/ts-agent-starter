import type { RunState, JsonObject } from './types.js';
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
export declare function grade(test: EvalCase, run: RunState): EvalScore;
export declare function aggregate(scores: EvalScore[]): {
    count: number;
    passed: number;
    passRate: number;
    p95DurationMs: number;
    totalTokens: number;
};
export declare function tokenF1(prediction: string, reference: string): number;
