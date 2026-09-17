import { randomUUID } from 'node:crypto';
import { AgentError } from './errors.js';
export interface Note {
    id: string;
    tenantId: string;
    subjectId: string;
    text: string;
    source: string;
    createdAt: number;
    expiresAt?: number;
}
export class NoteMemory {
    private readonly notes = new Map<string, Note>();
    add(input: Omit<Note, 'id' | 'createdAt'>, now = Date.now()): Note {
        if (!input.source || !input.text)
            throw new AgentError('MEMORY_SOURCE', '长期记忆必须带来源，不能把模型猜测当事实');
        const note = { ...input, id: randomUUID(), createdAt: now };
        this.notes.set(note.id, note);
        return structuredClone(note);
    }
    recall(tenantId: string, subjectId: string, now = Date.now()): Note[] { return [...this.notes.values()].filter(n => n.tenantId === tenantId && n.subjectId === subjectId && (n.expiresAt === undefined || n.expiresAt > now)).map(n => structuredClone(n)); }
    forget(tenantId: string, id: string): boolean { const n = this.notes.get(id); if (n?.tenantId !== tenantId)
        return false; return this.notes.delete(id); }
}
