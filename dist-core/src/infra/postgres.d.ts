import type { RunState, RunStore } from '../core/types.js';
export interface SqlPort {
    query(sql: string, values?: unknown[]): Promise<{
        rows: Record<string, unknown>[];
        rowCount?: number | null;
    }>;
}
export declare class PostgresRunStore implements RunStore {
    readonly db: SqlPort;
    constructor(db: SqlPort);
    create(state: RunState): Promise<void>;
    get(tenant: string, id: string): Promise<RunState | undefined>;
    save(state: RunState, expected: number): Promise<void>;
    list(tenant: string, limit?: number): Promise<RunState[]>;
}
/** 队列采用 PostgreSQL 租约。不依赖 Redis，不宣称跨外部 API 的恰好一次执行。 */
export declare class PostgresQueue {
    readonly db: SqlPort;
    constructor(db: SqlPort);
    enqueue(tenantId: string, runId: string): Promise<void>;
    claim(owner: string, leaseSeconds?: number, tenantId?: string): Promise<{
        tenantId: string;
        runId: string;
    } | undefined>;
    heartbeat(tenant: string, id: string, owner: string, leaseSeconds?: number): Promise<boolean>;
    finish(tenant: string, id: string, owner: string, status: 'done' | 'blocked'): Promise<void>;
}
export declare class PgVectorStore {
    readonly db: SqlPort;
    constructor(db: SqlPort);
    private vector;
    put(tenant: string, id: string, model: string, text: string, source: string, embedding: number[]): Promise<void>;
    search(tenant: string, model: string, embedding: number[], limit?: number): Promise<Record<string, unknown>[]>;
}
