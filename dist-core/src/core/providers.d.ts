import type { JsonObject, ModelPort, ModelRequest, ModelTurn } from './types.js';
export declare class ScriptedModel implements ModelPort {
    readonly name = "scripted-test-only";
    private readonly turns;
    calls: ModelRequest[];
    constructor(turns: ModelTurn[]);
    complete(request: ModelRequest): Promise<ModelTurn>;
}
export declare function finalTurn(content: string): ModelTurn;
export declare function callTurn(name: string, args: JsonObject, id?: string): ModelTurn;
/** 明确标记的离线规则模型，仅验证数据链路，不代表任何真实大模型能力。 */
export declare class DemoModel implements ModelPort {
    readonly name = "offline-rule-fixture-NOT-LLM";
    complete(request: ModelRequest): Promise<ModelTurn>;
}
export interface ChatModelOptions {
    baseUrl: string;
    apiKey: string;
    model: string;
    stream?: boolean;
    includeStreamUsage?: boolean;
    fetchImpl?: typeof fetch;
    allowLocalHttp?: boolean;
    maxResponseBytes?: number;
}
/** 兼容 Chat Completions 的服务适配器；不同服务对 tools / stream / usage 的支持需单独验收。 */
export declare class CompatibleChatModel implements ModelPort {
    readonly name: string;
    private readonly options;
    constructor(options: ChatModelOptions);
    complete(request: ModelRequest): Promise<ModelTurn>;
    private parseStream;
}
export declare function readBoundedText(response: Response, maxBytes: number): Promise<string>;
export declare function sseData(response: Response, maxBytes?: number): AsyncGenerator<string>;
