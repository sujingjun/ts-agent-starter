export class AgentError extends Error {
    code;
    retryable;
    constructor(code, message, retryable = false) {
        super(message);
        this.name = 'AgentError';
        this.code = code;
        this.retryable = retryable;
    }
}
export function failure(error) {
    if (error instanceof AgentError)
        return { code: error.code, message: error.message, retryable: error.retryable };
    if (error instanceof Error && error.name === 'AbortError')
        return { code: 'CANCELLED', message: '操作已取消', retryable: false };
    return { code: 'EXECUTION_ERROR', message: error instanceof Error ? error.message : String(error), retryable: false };
}
export function invariant(condition, code, message) {
    if (!condition)
        throw new AgentError(code, message);
}
//# sourceMappingURL=errors.js.map