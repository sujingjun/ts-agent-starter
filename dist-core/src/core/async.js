import { AgentError } from './errors.js';
/** 超时竞速 + AbortSignal。工具必须配合 signal；这不是进程沙箱，也不能强行终止同步死循环。 */
export async function bounded(task, timeoutMs, parent) {
    if (parent?.aborted)
        throw new AgentError('CANCELLED', '调用前已经取消');
    const local = new AbortController();
    let timer;
    let listener;
    const cancelled = new Promise((_, reject) => {
        timer = setTimeout(() => { local.abort(); reject(new AgentError('TIMEOUT', '调用超时', true)); }, Math.max(1, timeoutMs));
        listener = () => { local.abort(); reject(new AgentError('CANCELLED', '调用已取消')); };
        parent?.addEventListener('abort', listener, { once: true });
    });
    try {
        return await Promise.race([task(local.signal), cancelled]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
        if (listener)
            parent?.removeEventListener('abort', listener);
    }
}
export function clone(value) { return structuredClone(value); }
//# sourceMappingURL=async.js.map