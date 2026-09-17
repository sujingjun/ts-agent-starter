import { readdir, realpath, lstat, readFile, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { s } from '../core/schema.js';
import { invariant } from '../core/errors.js';
export async function safePath(root, path) {
    invariant(path.length > 0 && !isAbsolute(path) && !path.includes('\0'), 'PATH_DENIED', '只允许工作区相对路径');
    const base = await realpath(root);
    const target = resolve(base, path);
    const rel = relative(base, target);
    invariant(rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel), 'PATH_DENIED', '路径越过工作区');
    let current = base;
    for (const part of rel.split(sep).filter(Boolean)) {
        current = resolve(current, part);
        invariant(!(await lstat(current)).isSymbolicLink(), 'PATH_SYMLINK', '禁止符号链接');
    }
    const actual = await realpath(target);
    const finalRel = relative(base, actual);
    invariant(finalRel !== '..' && !finalRel.startsWith('..' + sep), 'PATH_DENIED', '真实路径越过工作区');
    return actual;
}
export function fileTools(root) {
    return [
        { name: 'list_files', description: '列出工作区指定目录，不跟随符号链接。', inputSchema: s.object({ path: s.string(500) }), outputSchema: s.object({ entries: { type: 'array', items: s.object({ name: s.string(500), kind: s.string(20) }) } }), effect: 'read', idempotent: true, timeoutMs: 2000,
            async execute(input) { const path = await safePath(root, input['path']); const entries = await readdir(path, { withFileTypes: true }); return { entries: entries.slice(0, 100).map(e => ({ name: e.name, kind: e.isSymbolicLink() ? 'symlink' : e.isDirectory() ? 'directory' : 'file' })) }; } },
        { name: 'read_file', description: '读取工作区内普通 UTF-8 文件，返回 SHA-256 以便后续安全修改。', inputSchema: s.object({ path: s.string(500) }), outputSchema: s.object({ text: s.string(20000), sha256: s.string(64) }), effect: 'read', idempotent: true, timeoutMs: 2000,
            async execute(input) { const path = await safePath(root, input['path']); const stat = await lstat(path); invariant(stat.isFile() && stat.size <= 20000, 'FILE_LIMIT', '仅支持不超过 20KB 的普通文件'); const text = await readFile(path, 'utf8'); return { text, sha256: createHash('sha256').update(text).digest('hex') }; } },
        { name: 'apply_patch', description: '精确替换文件中唯一一处文本，需要文件哈希匹配和人工审批；不创建新文件。', inputSchema: s.object({ path: s.string(500), expectedSha256: s.string(64), before: s.string(10000), after: s.string(10000) }), outputSchema: s.object({ sha256: s.string(64), changed: { type: 'boolean' } }), effect: 'write', idempotent: false, timeoutMs: 2000,
            async execute(input) {
                const path = await safePath(root, input['path']);
                const handle = await open(path, constants.O_RDWR | constants.O_NOFOLLOW);
                try {
                    const stat = await handle.stat();
                    invariant(stat.isFile() && stat.size <= 20000, 'FILE_LIMIT', '文件不符合修改限制');
                    const text = await handle.readFile('utf8');
                    invariant(createHash('sha256').update(text).digest('hex') === input['expectedSha256'], 'FILE_CONFLICT', '文件已变化，重新读取后再申请审批');
                    const before = input['before'];
                    const after = input['after'];
                    invariant(before && text.split(before).length === 2, 'PATCH_AMBIGUOUS', '待替换文本必须唯一且非空');
                    const updated = text.replace(before, after);
                    invariant(Buffer.byteLength(updated, 'utf8') <= 20000, 'FILE_LIMIT', '更新后的文件过大');
                    const bytes = Buffer.from(updated);
                    let offset = 0;
                    while (offset < bytes.length) {
                        const n = await handle.write(bytes, offset, bytes.length - offset, offset);
                        invariant(n.bytesWritten > 0, 'WRITE_FAILED', '写入未取得进展');
                        offset += n.bytesWritten;
                    }
                    await handle.truncate(bytes.length);
                    await handle.sync();
                    return { sha256: createHash('sha256').update(updated).digest('hex'), changed: updated !== text };
                }
                finally {
                    await handle.close();
                }
            } },
        { name: 'review_diff', description: '对提供的 diff 做有限静态风险检查，返回匹配到的证据行，不冒充完整语义审查。', inputSchema: s.object({ diff: s.string(20000) }), outputSchema: s.object({ findings: { type: 'array', items: s.object({ line: s.number(), rule: s.string(), evidence: s.string() }) } }), effect: 'read', idempotent: true, timeoutMs: 1000,
            async execute(input) { const lines = input['diff'].split('\n'); const rules = [{ name: 'dynamic-evaluation', pattern: /\beval\s*\(|new\s+Function\s*\(/ }, { name: 'shell-interpolation', pattern: /\bexec\s*\(\s*`/ }, { name: 'unsafe-html', pattern: /innerHTML\s*=/ }]; return { findings: lines.flatMap((line, i) => line.startsWith('+') && !line.startsWith('+++') ? rules.filter(r => r.pattern.test(line)).map(r => ({ line: i + 1, rule: r.name, evidence: line })) : []) }; } },
    ];
}
//# sourceMappingURL=file-tools.js.map