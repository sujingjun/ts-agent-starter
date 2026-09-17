export declare class AgentError extends Error {
    readonly code: string;
    readonly retryable: boolean;
    constructor(code: string, message: string, retryable?: boolean);
}
export declare function failure(error: unknown): {
    code: string;
    message: string;
    retryable: boolean;
};
export declare function invariant(condition: unknown, code: string, message: string): asserts condition;
