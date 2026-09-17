export interface Note {
    id: string;
    tenantId: string;
    subjectId: string;
    text: string;
    source: string;
    createdAt: number;
    expiresAt?: number;
}
export declare class NoteMemory {
    private readonly notes;
    add(input: Omit<Note, 'id' | 'createdAt'>, now?: number): Note;
    recall(tenantId: string, subjectId: string, now?: number): Note[];
    forget(tenantId: string, id: string): boolean;
}
