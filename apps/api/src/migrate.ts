import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from './resources.js';
if (!process.env['DATABASE_URL'])
    throw new Error('缺少 DATABASE_URL');
const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const client = await pool.connect();
try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(7182901)");
    await client.query(await readFile(resolve('infra/migrations/001-core.sql'), 'utf8'));
    if (process.argv.includes('--vector'))
        await client.query(await readFile(resolve('infra/migrations/002-vector.sql'), 'utf8'));
    await client.query('COMMIT');
    console.log('数据库迁移完成');
}
catch (error) {
    await client.query('ROLLBACK');
    throw error;
}
finally {
    client.release();
    await pool.end();
}
