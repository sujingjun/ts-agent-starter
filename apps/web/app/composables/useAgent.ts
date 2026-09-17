import { ref, onBeforeUnmount } from 'vue';
interface EventRow {
    seq: number;
    type: string;
    at: string;
    data: Record<string, unknown>;
}
interface RunView {
    id: string;
    status: string;
    result?: string;
    error?: {
        code: string;
        message: string;
    };
    step: number;
    toolCalls: number;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
    pending: {
        call: {
            id: string;
            name: string;
            arguments: unknown;
        };
        phase: string;
        approved?: boolean;
    }[];
    events: EventRow[];
}
export function useAgent() {
    const config = useRuntimeConfig();
    const token = ref('');
    const prompt = ref('解释 MCP 工具授权与审批的区别');
    const run = ref<RunView>();
    const busy = ref(false);
    const error = ref('');
    const events = ref<EventRow[]>([]);
    const skill = ref('');
    const skills = ref<{
        name: string;
        description: string;
    }[]>([]);
    const model = ref('未连接');
    let controller: AbortController | undefined;
    async function request<T>(path: string, body?: unknown): Promise<T> { const res = await fetch(String(config.public.apiBase) + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + token.value, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); const data = await res.json(); if (!res.ok)
        throw new Error(data.error?.message ?? data.message ?? `HTTP ${res.status}`); return data as T; }
    async function connect() { try {
        const data = await request<{
            model: string;
            skills: {
                name: string;
                description: string;
            }[];
        }>('/api/capabilities');
        model.value = data.model;
        skills.value = data.skills;
        error.value = '';
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
    } }
    async function watch(id: string) {
        controller?.abort();
        const current = new AbortController();
        controller = current;
        const last = events.value.at(-1)?.seq ?? 0;
        const response = await fetch(String(config.public.apiBase) + `/api/runs/${id}/events?after=${last}`, { headers: { Authorization: 'Bearer ' + token.value }, signal: current.signal });
        if (!response.ok || !response.body)
            throw new Error(`事件连接失败 HTTP ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const chunk = await reader.read();
                if (chunk.done)
                    break;
                buffer += decoder.decode(chunk.value, { stream: true });
                let match: RegExpExecArray | null;
                while ((match = /\r?\n\r?\n/.exec(buffer))) {
                    const block = buffer.slice(0, match.index);
                    buffer = buffer.slice(match.index + match[0].length);
                    const raw = block.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
                    if (raw) {
                        const event = JSON.parse(raw) as EventRow;
                        if (!events.value.some(e => e.seq === event.seq))
                            events.value.push(event);
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
        run.value = await request<RunView>(`/api/runs/${id}`);
    }
    async function start() { if (!prompt.value.trim() || !token.value) {
        error.value = '先输入访问令牌和问题';
        return;
    } busy.value = true; error.value = ''; events.value = []; try {
        run.value = await request<RunView>('/api/runs', { prompt: prompt.value, ...(skill.value ? { skill: skill.value } : {}) });
        await watch(run.value.id);
    }
    catch (e) {
        if (!(e instanceof Error && e.name === 'AbortError'))
            error.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        busy.value = false;
    } }
    async function approve(callId: string, allow: boolean) { if (!run.value)
        return; busy.value = true; error.value = ''; try {
        await request(`/api/runs/${run.value.id}/approve`, { callId, allow });
        await watch(run.value.id);
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        busy.value = false;
    } }
    async function cancel() { if (!run.value)
        return; try {
        await request(`/api/runs/${run.value.id}/cancel`, {});
        controller?.abort();
        run.value = await request(`/api/runs/${run.value.id}`);
        busy.value = false;
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
    } }
    onBeforeUnmount(() => controller?.abort());
    return { token, prompt, run, busy, error, events, skill, skills, model, connect, start, approve, cancel };
}
