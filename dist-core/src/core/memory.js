import { randomUUID } from 'node:crypto';
import { AgentError } from './errors.js';
export class NoteMemory {
    notes = new Map();
    add(input, now = Date.now()) {
        if (!input.source || !input.text)
            throw new AgentError('MEMORY_SOURCE', '长期记忆必须带来源，不能把模型猜测当事实');
        const note = { ...input, id: randomUUID(), createdAt: now };
        this.notes.set(note.id, note);
        return structuredClone(note);
    }
    recall(tenantId, subjectId, now = Date.now()) { return [...this.notes.values()].filter(n => n.tenantId === tenantId && n.subjectId === subjectId && (n.expiresAt === undefined || n.expiresAt > now)).map(n => structuredClone(n)); }
    forget(tenantId, id) {
        const n = this.notes.get(id);
        if (n?.tenantId !== tenantId)
            return false;
        return this.notes.delete(id);
    }
}
//# sourceMappingURL=memory.js.map