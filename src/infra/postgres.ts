import type { RunState, RunStore } from '../core/types.js';
import { AgentError } from '../core/errors.js';
export interface SqlPort {
    query(sql: string, values?: unknown[]): Promise<{
        rows: Record<string, unknown>[];
        rowCount?: number | null;
    }>;
}
export class PostgresRunStore implements RunStore {
    readonly db: SqlPort;
    constructor(db: SqlPort) { this.db = db; }
    async create(state: RunState) { await this.db.query('INSERT INTO agent_runs(tenant_id,id,session_id,status,revision,body) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [state.tenantId, state.id, state.sessionId, state.status, state.revision, JSON.stringify(state)]); }
    async get(tenant: string, id: string): Promise<RunState | undefined> { const r = await this.db.query('SELECT body FROM agent_runs WHERE tenant_id=$1 AND id=$2', [tenant, id]); return r.rows[0]?.['body'] as RunState | undefined; }
    async save(state: RunState, expected: number) {
        const next = { ...state, revision: expected + 1, updatedAt: new Date().toISOString() };
        const r = await this.db.query('UPDATE agent_runs SET status=$3,revision=$4,body=$5::jsonb,updated_at=now() WHERE tenant_id=$1 AND id=$2 AND revision=$6 RETURNING id', [state.tenantId, state.id, state.status, next.revision, JSON.stringify(next), expected]);
        if (r.rows.length !== 1)
            throw new AgentError('CONFLICT', '运行版本发生冲突');
        state.revision = next.revision;
        state.updatedAt = next.updatedAt;
    }
    async list(tenant: string, limit = 50) { const r = await this.db.query('SELECT body FROM agent_runs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2', [tenant, Math.min(100, Math.max(1, limit))]); return r.rows.map(r => r['body'] as RunState); }
}
/** 队列采用 PostgreSQL 租约。不依赖 Redis，不宣称跨外部 API 的恰好一次执行。 */
export class PostgresQueue {
    readonly db: SqlPort;
    constructor(db: SqlPort) { this.db = db; }
    async enqueue(tenantId: string, runId: string) {
        await this.db.query(`INSERT INTO agent_jobs(tenant_id,run_id,status) VALUES($1,$2,'pending')
    ON CONFLICT(tenant_id,run_id) DO UPDATE SET status='pending',available_at=now(),owner=NULL,lease_until=NULL WHERE agent_jobs.status NOT IN ('active')`, [tenantId, runId]);
    }
    async claim(owner: string, leaseSeconds = 60, tenantId?: string): Promise<{
        tenantId: string;
        runId: string;
    } | undefined> {
        const r = await this.db.query(`WITH candidate AS (SELECT tenant_id,run_id FROM agent_jobs WHERE ((status='pending' AND available_at<=now()) OR (status='active' AND lease_until<now())) AND ($3::text IS NULL OR tenant_id=$3) ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1)
      UPDATE agent_jobs j SET status='active',owner=$1,lease_until=now()+($2*interval '1 second'),attempts=attempts+1 FROM candidate c WHERE j.tenant_id=c.tenant_id AND j.run_id=c.run_id RETURNING j.tenant_id,j.run_id`, [owner, leaseSeconds, tenantId ?? null]);
        const row = r.rows[0];
        return row ? { tenantId: String(row['tenant_id']), runId: String(row['run_id']) } : undefined;
    }
    async heartbeat(tenant: string, id: string, owner: string, leaseSeconds = 60): Promise<boolean> { const r = await this.db.query(`UPDATE agent_jobs SET lease_until=now()+($4*interval '1 second') WHERE tenant_id=$1 AND run_id=$2 AND owner=$3 AND status='active' AND lease_until>now() RETURNING run_id`, [tenant, id, owner, leaseSeconds]); return r.rows.length === 1; }
    async finish(tenant: string, id: string, owner: string, status: 'done' | 'blocked') { await this.db.query('UPDATE agent_jobs SET status=$4,owner=NULL,lease_until=NULL WHERE tenant_id=$1 AND run_id=$2 AND owner=$3', [tenant, id, owner, status]); }
}
export class PgVectorStore {
    readonly db: SqlPort;
    constructor(db: SqlPort) { this.db = db; }
    private vector(values: number[]) { if (!values.length || values.some(n => !Number.isFinite(n)))
        throw new AgentError('VECTOR_INVALID', '向量无效'); return '[' + values.join(',') + ']'; }
    async put(tenant: string, id: string, model: string, text: string, source: string, embedding: number[]) { await this.db.query('INSERT INTO evidence_vectors(tenant_id,id,embedding_model,content,source,embedding,dimensions) VALUES($1,$2,$3,$4,$5,$6::vector,$7) ON CONFLICT(tenant_id,id,embedding_model) DO UPDATE SET content=$4,source=$5,embedding=$6::vector,dimensions=$7', [tenant, id, model, text, source, this.vector(embedding), embedding.length]); }
    async search(tenant: string, model: string, embedding: number[], limit = 5) { const r = await this.db.query('SELECT id,content,source,1-(embedding <=> $3::vector) AS score FROM evidence_vectors WHERE tenant_id=$1 AND embedding_model=$2 AND dimensions=$4 ORDER BY embedding <=> $3::vector LIMIT $5', [tenant, model, this.vector(embedding), embedding.length, Math.min(20, Math.max(1, limit))]); return r.rows; }
}
