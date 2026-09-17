import { randomUUID } from 'node:crypto';
import { makeResources } from '../api/src/resources.js';
const r = await makeResources();
if (!r.queue || !r.pool)
    throw new Error('Worker 需要 STORE_MODE=postgres');
const owner = randomUUID();
let stopped = false;
let active: AbortController | undefined;
const stop = () => { stopped = true; active?.abort(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
console.log('worker.started', owner);
try {
    while (!stopped) {
        // 补偿 create 与 enqueue 之间进程退出的间隙，或审批恢复后未入队的任务。
        await r.pool.query(`INSERT INTO agent_jobs(tenant_id,run_id,status) SELECT tenant_id,id,'pending' FROM agent_runs WHERE status='queued' AND tenant_id=$1
    ON CONFLICT(tenant_id,run_id) DO UPDATE SET status='pending',available_at=now(),owner=NULL,lease_until=NULL WHERE agent_jobs.status IN ('blocked','done')`, [r.tenantId]);
        const job = await r.queue.claim(owner, 60, r.tenantId);
        if (!job) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }
        active = new AbortController();
        let beatBusy = false;
        const timer = setInterval(() => { if (beatBusy)
            return; beatBusy = true; void r.queue!.heartbeat(job.tenantId, job.runId, owner).then(ok => { if (!ok)
            active?.abort(); }, () => active?.abort()).finally(() => { beatBusy = false; }); }, 15000);
        try {
            const state = await r.runner.execute(job.tenantId, job.runId, { signal: active.signal });
            await r.queue.finish(job.tenantId, job.runId, owner, ['waiting_approval', 'reconciliation_required'].includes(state.status) ? 'blocked' : 'done');
        }
        catch (error) {
            console.error('worker.job.failed', error instanceof Error ? error.name : 'UNKNOWN');
        }
        finally {
            clearInterval(timer);
            active = undefined;
        }
    }
}
finally {
    await r.pool.end();
}
