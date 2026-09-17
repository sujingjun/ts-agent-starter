import { Pool } from 'pg';
import { resolve } from 'node:path';
import { createRuntime } from '../../../src/runtime.js';
import { PostgresQueue, PostgresRunStore } from '../../../src/infra/postgres.js';
import { FileRunStore, MemoryRunStore, SkillCatalog } from '../../../src/core/index.js';
export { Pool } from 'pg';
export const RESOURCES = Symbol('RESOURCES');
export type Resources = Awaited<ReturnType<typeof makeResources>>;
export async function makeResources() {
    const root = process.cwd();
    const tenantId = process.env['LOCAL_TENANT_ID'] ?? 'local';
    const storeMode = process.env['STORE_MODE'] ?? 'file';
    if (!['file', 'memory', 'postgres'].includes(storeMode))
        throw new Error('STORE_MODE 必须是 file、memory 或 postgres');
    if (storeMode === 'postgres' && !process.env['DATABASE_URL'])
        throw new Error('缺少 DATABASE_URL');
    const pool = storeMode === 'postgres' ? new Pool({ connectionString: process.env['DATABASE_URL'], max: 10 }) : undefined;
    if (pool)
        await pool.query('SELECT 1');
    const store = pool ? new PostgresRunStore(pool) : storeMode === 'file' ? new FileRunStore(resolve(root, '.data/runs')) : new MemoryRunStore();
    const queue = pool ? new PostgresQueue(pool) : undefined;
    const mode = process.env['EXECUTION_MODE'] ?? 'inline';
    if (!['inline', 'worker'].includes(mode))
        throw new Error('EXECUTION_MODE 必须是 inline 或 worker');
    if (mode === 'worker' && !queue)
        throw new Error('worker 模式需要 PostgreSQL');
    const runtime = await createRuntime({ store, root, enableExternal: true });
    const skills = new SkillCatalog();
    await skills.loadDirectory(resolve(root, 'skills'));
    return { ...runtime, pool, queue, skills, mode, tenantId };
}
