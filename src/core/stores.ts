import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { RunState, RunStore } from './types.js';
import { clone } from './async.js';
import { AgentError } from './errors.js';
export class MemoryRunStore implements RunStore {
    protected readonly rows = new Map<string, RunState>();
    private key(tenant: string, id: string) { return `${tenant}\0${id}`; }
    async create(state: RunState) { const key = this.key(state.tenantId, state.id); if (this.rows.has(key))
        throw new AgentError('CONFLICT', '运行已存在'); this.rows.set(key, clone(state)); }
    async get(tenant: string, id: string) { const row = this.rows.get(this.key(tenant, id)); return row ? clone(row) : undefined; }
    async save(state: RunState, expected: number) {
        const current = this.rows.get(this.key(state.tenantId, state.id));
        if (!current || current.revision !== expected)
            throw new AgentError('CONFLICT', '运行状态已被其他执行器修改');
        state.revision = expected + 1;
        state.updatedAt = new Date().toISOString();
        this.rows.set(this.key(state.tenantId, state.id), clone(state));
    }
    async list(tenant: string, limit = 50) { return [...this.rows.values()].filter(r => r.tenantId === tenant).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(clone); }
}
/** 本地教学存储：同一实例内串行保存 + 原子替换。多进程场景必须换 PostgresRunStore。 */
export class FileRunStore implements RunStore {
    private readonly directory: string;
    private tail: Promise<unknown> = Promise.resolve();
    constructor(directory: string) { this.directory = directory; }
    private filename(tenant: string, id: string) { return join(this.directory, createHash('sha256').update(`${tenant}\0${id}`).digest('hex') + '.json'); }
    private async serial<T>(fn: () => Promise<T>): Promise<T> { const next = this.tail.then(fn, fn); this.tail = next.catch(() => { }); return next; }
    async create(state: RunState) { await mkdir(this.directory, { recursive: true }); await writeFile(this.filename(state.tenantId, state.id), JSON.stringify(state), { encoding: 'utf8', flag: 'wx', mode: 0o600 }); }
    async get(tenant: string, id: string): Promise<RunState | undefined> {
        try {
            const state = JSON.parse(await readFile(this.filename(tenant, id), 'utf8')) as RunState;
            if (state.tenantId !== tenant || state.id !== id)
                throw new AgentError('STORE_CORRUPT', '运行身份不一致');
            return state;
        }
        catch (e) {
            if ((e as NodeJS.ErrnoException).code === 'ENOENT')
                return;
            throw e;
        }
    }
    async save(state: RunState, expected: number) {
        await this.serial(async () => {
            const old = await this.get(state.tenantId, state.id);
            if (!old || old.revision !== expected)
                throw new AgentError('CONFLICT', '运行版本冲突');
            const next = { ...state, revision: expected + 1, updatedAt: new Date().toISOString() };
            const file = this.filename(state.tenantId, state.id);
            const tmp = file + '.' + randomUUID() + '.tmp';
            await writeFile(tmp, JSON.stringify(next), { encoding: 'utf8', mode: 0o600 });
            await rename(tmp, file);
            state.revision = next.revision;
            state.updatedAt = next.updatedAt;
        });
    }
    async list(tenant: string, limit = 50) {
        await mkdir(this.directory, { recursive: true });
        const rows: RunState[] = [];
        for (const name of await readdir(this.directory))
            if (name.endsWith('.json')) {
                const row = JSON.parse(await readFile(join(this.directory, name), 'utf8')) as RunState;
                if (row.tenantId === tenant)
                    rows.push(row);
            }
        return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
    }
}
