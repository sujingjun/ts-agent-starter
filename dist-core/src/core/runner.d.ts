import type { ApprovalPolicy, ModelPort, RunInput, RunObserver, RunState, RunStore, ToolResult } from './types.js';
import { ToolRegistry } from './tools.js';
/** 显式控制循环：每个外部副作用之前都先落盘，无法确认的结果进入人工核对。 */
export declare class AgentRunner {
    readonly model: ModelPort;
    readonly registry: ToolRegistry;
    readonly store: RunStore;
    readonly policy: ApprovalPolicy;
    private readonly locks;
    constructor(options: {
        model: ModelPort;
        registry: ToolRegistry;
        store: RunStore;
        policy?: ApprovalPolicy;
    });
    create(input: RunInput): Promise<RunState>;
    private required;
    private record;
    approve(tenant: string, id: string, callId: string, allow: boolean): Promise<RunState>;
    reconcile(tenant: string, id: string, callId: string, resolution: {
        kind: 'result';
        result: ToolResult;
    } | {
        kind: 'not_executed';
    }): Promise<RunState>;
    cancel(tenant: string, id: string): Promise<RunState>;
    execute(tenant: string, id: string, options?: {
        signal?: AbortSignal;
        observer?: RunObserver;
    }): Promise<RunState>;
}
