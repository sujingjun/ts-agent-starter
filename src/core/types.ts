/** 核心契约不依赖 NestJS、数据库或模型厂商。所有落盘字段均可 JSON 序列化。 */
export type Json = null | boolean | number | string | Json[] | {
    [key: string]: Json;
};
export type JsonObject = {
    [key: string]: Json;
};
export interface JsonSchema {
    type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';
    description?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: boolean;
    items?: JsonSchema;
    enum?: Json[];
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    minItems?: number;
    maxItems?: number;
}
export interface ToolCall {
    id: string;
    name: string;
    arguments: JsonObject;
}
export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: ToolCall[];
    toolCallId?: string;
}
export interface ModelUsage {
    inputTokens: number;
    outputTokens: number;
}
export interface ModelTurn {
    content: string;
    toolCalls: ToolCall[];
    usage: ModelUsage;
}
export interface ModelRequest {
    messages: Message[];
    tools: ToolDescription[];
    signal: AbortSignal;
    onText?: (text: string) => void;
}
export interface ModelPort {
    readonly name: string;
    complete(request: ModelRequest): Promise<ModelTurn>;
}
export type Effect = 'read' | 'write' | 'external' | 'destructive';
export interface ToolDescription {
    name: string;
    description: string;
    inputSchema: JsonSchema;
}
export interface ToolContext {
    runId: string;
    tenantId: string;
    sessionId: string;
    signal: AbortSignal;
    idempotencyKey: string;
}
export interface ToolDefinition extends ToolDescription {
    outputSchema: JsonSchema;
    effect: Effect;
    /** 必须真的在接收端去重，不能仅仅把此字段设为 true。 */
    idempotent: boolean;
    timeoutMs: number;
    execute(input: JsonObject, context: ToolContext): Promise<Json>;
}
export interface ToolFailure {
    code: string;
    message: string;
    retryable: boolean;
}
export type ToolResult = {
    ok: true;
    data: Json;
} | {
    ok: false;
    error: ToolFailure;
};
export interface PendingCall {
    call: ToolCall;
    phase: 'pending' | 'executing' | 'done';
    approved?: boolean;
    result?: ToolResult;
}
export type RunStatus = 'queued' | 'running' | 'waiting_approval' | 'reconciliation_required' | 'completed' | 'failed' | 'cancelled';
export interface Limits {
    maxSteps: number;
    maxToolCalls: number;
    maxRepeatedCalls: number;
    maxInputTokensEstimate: number;
    maxTotalTokens: number;
    maxDurationMs: number;
    modelTimeoutMs: number;
    maxToolResultBytes: number;
}
export const DEFAULT_LIMITS: Limits = {
    maxSteps: 8, maxToolCalls: 20, maxRepeatedCalls: 2,
    maxInputTokensEstimate: 12000, maxTotalTokens: 32000,
    maxDurationMs: 120000, modelTimeoutMs: 30000, maxToolResultBytes: 32000,
};
export interface RunEvent {
    seq: number;
    type: string;
    at: string;
    data: JsonObject;
}
export interface RunState {
    id: string;
    tenantId: string;
    sessionId: string;
    status: RunStatus;
    revision: number;
    createdAt: string;
    updatedAt: string;
    messages: Message[];
    pending: PendingCall[];
    step: number;
    toolCalls: number;
    repetitions: Record<string, number>;
    usage: ModelUsage;
    activeDurationMs: number;
    limits: Limits;
    events: RunEvent[];
    result?: string;
    error?: ToolFailure;
}
export interface RunStore {
    create(state: RunState): Promise<void>;
    get(tenantId: string, id: string): Promise<RunState | undefined>;
    /** 乐观并发控制；状态与事件必须原子保存。保存成功后递增 state.revision。 */
    save(state: RunState, expectedRevision: number): Promise<void>;
    list(tenantId: string, limit?: number): Promise<RunState[]>;
}
export interface ApprovalPolicy {
    decide(tool: ToolDefinition, state: RunState): 'allow' | 'approve' | 'deny';
}
export interface RunInput {
    tenantId: string;
    sessionId?: string;
    prompt: string;
    system?: string;
    history?: Message[];
    limits?: Partial<Limits>;
}
export type RunObserver = (event: RunEvent) => void;
