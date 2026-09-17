/** 超时竞速 + AbortSignal。工具必须配合 signal；这不是进程沙箱，也不能强行终止同步死循环。 */
export declare function bounded<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs: number, parent?: AbortSignal): Promise<T>;
export declare function clone<T>(value: T): T;
