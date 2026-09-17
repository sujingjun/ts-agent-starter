import type { RunState, RunStore } from './types.js';
export declare class MemoryRunStore implements RunStore {
    protected readonly rows: Map<string, RunState>;
    private key;
    create(state: RunState): Promise<void>;
    get(tenant: string, id: string): Promise<RunState | undefined>;
    save(state: RunState, expected: number): Promise<void>;
    list(tenant: string, limit?: number): Promise<RunState[]>;
}
/** 本地教学存储：同一实例内串行保存 + 原子替换。多进程场景必须换 PostgresRunStore。 */
export declare class FileRunStore implements RunStore {
    private readonly directory;
    private tail;
    constructor(directory: string);
    private filename;
    private serial;
    create(state: RunState): Promise<void>;
    get(tenant: string, id: string): Promise<RunState | undefined>;
    save(state: RunState, expected: number): Promise<void>;
    list(tenant: string, limit?: number): Promise<RunState[]>;
}
