import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { clone } from './async.js';
import { AgentError } from './errors.js';
export class MemoryRunStore {
    rows = new Map();
    key(tenant, id) { return `${tenant}\0${id}`; }
    async create(state) {
        const key = this.key(state.tenantId, state.id);
        if (this.rows.has(key))
            throw new AgentError('CONFLICT', '运行已存在');
        this.rows.set(key, clone(state));
    }
    async get(tenant, id) { const row = this.rows.get(this.key(tenant, id)); return row ? clone(row) : undefined; }
    async save(state, expected) {
        const current = this.rows.get(this.key(state.tenantId, state.id));
        if (!current || current.revision !== expected)
            throw new AgentError('CONFLICT', '运行状态已被其他执行器修改');
        state.revision = expected + 1;
        state.updatedAt = new Date().toISOString();
        this.rows.set(this.key(state.tenantId, state.id), clone(state));
    }
    async list(tenant, limit = 50) { return [...this.rows.values()].filter(r => r.tenantId === tenant).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(clone); }
}
/** 本地教学存储：同一实例内串行保存 + 原子替换。多进程场景必须换 PostgresRunStore。 */
export class FileRunStore {
    directory;
    tail = Promise.resolve();
    constructor(directory) { this.directory = directory; }
    filename(tenant, id) { return join(this.directory, createHash('sha256').update(`${tenant}\0${id}`).digest('hex') + '.json'); }
    async serial(fn) { const next = this.tail.then(fn, fn); this.tail = next.catch(() => { }); return next; }
    async create(state) { await mkdir(this.directory, { recursive: true }); await writeFile(this.filename(state.tenantId, state.id), JSON.stringify(state), { encoding: 'utf8', flag: 'wx', mode: 0o600 }); }
    async get(tenant, id) {
        try {
            const state = JSON.parse(await readFile(this.filename(tenant, id), 'utf8'));
            if (state.tenantId !== tenant || state.id !== id)
                throw new AgentError('STORE_CORRUPT', '运行身份不一致');
            return state;
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return;
            throw e;
        }
    }
    async save(state, expected) {
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
    async list(tenant, limit = 50) {
        await mkdir(this.directory, { recursive: true });
        const rows = [];
        for (const name of await readdir(this.directory))
            if (name.endsWith('.json')) {
                const row = JSON.parse(await readFile(join(this.directory, name), 'utf8'));
                if (row.tenantId === tenant)
                    rows.push(row);
            }
        return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
    }
}
//# sourceMappingURL=stores.js.map