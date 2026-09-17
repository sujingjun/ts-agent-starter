import type { JsonObject } from './types.js';
export interface FlowNode {
    id: string;
    dependsOn: string[];
    run(state: Readonly<JsonObject>, signal: AbortSignal): Promise<JsonObject>;
}
/** 小型有向无环工作流：输入输出显式、节点只执行一次。不是 LangGraph 全量替代。 */
export declare class Workflow {
    private readonly nodes;
    constructor(nodes: FlowNode[]);
    run(input: JsonObject, signal?: AbortSignal): Promise<{
        state: JsonObject;
        order: string[];
    }>;
}
