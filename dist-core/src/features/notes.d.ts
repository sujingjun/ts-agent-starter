import type { ToolDefinition } from '../core/types.js';
export interface Note {
    id: string;
    title: string;
    text: string;
    createdAt: string;
}
/** 内容寻址笔记：同一租户同一内容只保存一份；不是任意外部系统的恰好一次保证。 */
export declare class NoteStore {
    private readonly root;
    constructor(root: string);
    private directory;
    save(tenant: string, title: string, text: string): Promise<Note>;
    list(tenant: string): Promise<Note[]>;
}
export declare function noteTools(notes: NoteStore): ToolDefinition[];
