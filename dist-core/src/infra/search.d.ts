import type { ToolDefinition } from '../core/types.js';
export declare function tavilySearchTool(apiKey: string, fetchImpl?: typeof fetch): ToolDefinition;
export declare function runDifyWorkflow(baseUrl: string, apiKey: string, inputs: Record<string, unknown>, user: string, signal: AbortSignal, fetchImpl?: typeof fetch): Promise<unknown>;
export declare function embedTexts(baseUrl: string, apiKey: string, model: string, input: string[], signal: AbortSignal, fetchImpl?: typeof fetch): Promise<number[][]>;
