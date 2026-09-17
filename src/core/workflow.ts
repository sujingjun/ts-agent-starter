import { AgentError } from './errors.js';
import type { JsonObject } from './types.js';
export interface FlowNode {
    id: string;
    dependsOn: string[];
    run(state: Readonly<JsonObject>, signal: AbortSignal): Promise<JsonObject>;
}
/** 小型有向无环工作流：输入输出显式、节点只执行一次。不是 LangGraph 全量替代。 */
export class Workflow {
    private readonly nodes: FlowNode[];
    constructor(nodes: FlowNode[]) {
        const ids = new Set(nodes.map(n => n.id));
        if (ids.size !== nodes.length)
            throw new AgentError('FLOW_DUPLICATE', '节点 ID 重复');
        for (const node of nodes)
            for (const id of node.dependsOn)
                if (!ids.has(id))
                    throw new AgentError('FLOW_DEPENDENCY', '依赖不存在');
        this.nodes = nodes;
    }
    async run(input: JsonObject, signal = new AbortController().signal): Promise<{
        state: JsonObject;
        order: string[];
    }> {
        const completed = new Set<string>();
        const state = structuredClone(input);
        const order: string[] = [];
        while (completed.size < this.nodes.length) {
            if (signal.aborted)
                throw new AgentError('CANCELLED', '工作流已取消');
            const ready = this.nodes.filter(n => !completed.has(n.id) && n.dependsOn.every(d => completed.has(d)));
            if (!ready.length)
                throw new AgentError('FLOW_CYCLE', '依赖有环');
            for (const node of ready) {
                const result = await node.run(Object.freeze(structuredClone(state)), signal);
                Object.assign(state, result);
                completed.add(node.id);
                order.push(node.id);
            }
        }
        return { state, order };
    }
}
