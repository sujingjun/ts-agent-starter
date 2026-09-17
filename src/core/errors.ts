export class AgentError extends Error {
    readonly code: string;
    readonly retryable: boolean;
    constructor(code: string, message: string, retryable = false) {
        super(message);
        this.name = 'AgentError';
        this.code = code;
        this.retryable = retryable;
    }
}
export function failure(error: unknown) {
    if (error instanceof AgentError)
        return { code: error.code, message: error.message, retryable: error.retryable };
    if (error instanceof Error && error.name === 'AbortError')
        return { code: 'CANCELLED', message: '操作已取消', retryable: false };
    return { code: 'EXECUTION_ERROR', message: error instanceof Error ? error.message : String(error), retryable: false };
}
export function invariant(condition: unknown, code: string, message: string): asserts condition {
    if (!condition)
        throw new AgentError(code, message);
}
