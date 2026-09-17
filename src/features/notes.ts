import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { invariant } from '../core/errors.js';
import { s } from '../core/schema.js';
import type { Json, ToolDefinition } from '../core/types.js';

export interface Note { id: string; title: string; text: string; createdAt: string }
/** 内容寻址笔记：同一租户同一内容只保存一份；不是任意外部系统的恰好一次保证。 */
export class NoteStore {
  constructor(private readonly root: string) {}
  private directory(tenant: string) {
    return join(this.root, createHash('sha256').update(tenant).digest('hex'));
  }
  async save(tenant: string, title: string, text: string): Promise<Note> {
    invariant(title.trim().length > 0 && title.length <= 200, 'NOTE_TITLE', '笔记标题必须为 1—200 字符');
    invariant(text.trim().length > 0 && text.length <= 16000, 'NOTE_TEXT', '笔记正文必须为 1—16000 字符');
    const id = createHash('sha256').update(JSON.stringify([tenant, title, text])).digest('hex');
    const dir = this.directory(tenant);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const note: Note = { id, title, text, createdAt: new Date().toISOString() };
    const path = join(dir, id + '.json');
    // 写临时文件后替换，避免进程在 JSON 写入中途退出产生半个文件。
    try { return JSON.parse(await readFile(path, 'utf8')) as Note; }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    const temp = path + '.' + randomUUID() + '.tmp';
    await writeFile(temp, JSON.stringify(note), { mode: 0o600 });
    await rename(temp, path);
    return note;
  }
  async list(tenant: string): Promise<Note[]> {
    const dir = this.directory(tenant);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const rows: Note[] = [];
    for (const name of await readdir(dir)) {
      if (/^[a-f0-9]{64}\.json$/.test(name)) rows.push(JSON.parse(await readFile(join(dir, name), 'utf8')) as Note);
    }
    return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100);
  }
}
export function noteTools(notes: NoteStore): ToolDefinition[] {
  return [
    { name: 'save_note', description: '保存一条长期笔记，必须由用户批准这次调用。相同内容去重。',
      inputSchema: s.object({ title: s.string(200), text: s.string(16000) }), outputSchema: {},
      effect: 'write', idempotent: true, timeoutMs: 3000,
      execute: async (args, ctx) => {
        ctx.signal.throwIfAborted();
        return await notes.save(ctx.tenantId, args['title'] as string, args['text'] as string) as unknown as Json;
      } },
    { name: 'read_notes', description: '读取当前身份已保存的笔记；不能读取其他租户。',
      inputSchema: s.object({}), outputSchema: {}, effect: 'read', idempotent: true, timeoutMs: 3000,
      execute: async (_args,ctx) => ({ notes: await notes.list(ctx.tenantId) }) as unknown as Json },
  ];
}
