import type { ApprovalPolicy, RunState, ToolDefinition } from './types.js';
export declare class ToolRegistry {
    private readonly tools;
    register(tool: ToolDefinition): this;
    get(name: string): ToolDefinition | undefined;
    describe(): {
        name: string;
        description: string;
        inputSchema: import("./types.js").JsonSchema;
    }[];
}
export declare class DefaultPolicy implements ApprovalPolicy {
    readonly denied: ReadonlySet<string>;
    constructor(denied?: string[]);
    decide(tool: ToolDefinition, _state: RunState): 'allow' | 'approve' | 'deny';
}
