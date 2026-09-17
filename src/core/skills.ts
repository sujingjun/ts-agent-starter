import { readdir, readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { AgentError } from './errors.js';
export interface Skill {
    name: string;
    description: string;
    body: string;
    sha256: string;
}
/** 只接受简单 name/description 元数据及 description 的折行形式。未知权限字段不能扩大工具权限。 */
export function parseSkill(markdown: string): Skill {
    const matched = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(markdown);
    if (!matched)
        throw new AgentError('SKILL_FORMAT', '缺少 SKILL.md YAML 头');
    let name = '', description = '';
    let folded = false;
    for (const line of matched[1]!.split(/\r?\n/)) {
        if (/^name:\s*/.test(line)) {
            name = line.replace(/^name:\s*/, '').trim();
            folded = false;
        }
        else if (/^description:\s*/.test(line)) {
            description = line.replace(/^description:\s*/, '').trim();
            folded = /^[>|]-?$/.test(description);
            if (folded)
                description = '';
        }
        else if (folded && /^\s+/.test(line))
            description += (description ? ' ' : '') + line.trim();
        else if (line.trim() && !line.startsWith('#'))
            throw new AgentError('SKILL_METADATA', '只支持 name 与 description；复杂 YAML 请使用专门解析适配器');
    }
    name = name.replace(/^['"]|['"]$/g, '');
    description = description.replace(/^['"]|['"]$/g, '');
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(name) || !description || description.length > 1000)
        throw new AgentError('SKILL_METADATA', '技能名称或说明无效');
    return { name, description, body: matched[2]!, sha256: createHash('sha256').update(markdown).digest('hex') };
}
export class SkillCatalog {
    private readonly map = new Map<string, Skill>();
    add(skill: Skill) { if (this.map.has(skill.name))
        throw new AgentError('SKILL_DUPLICATE', '技能名称重复'); this.map.set(skill.name, structuredClone(skill)); }
    metadata() { return [...this.map.values()].map(({ name, description, sha256 }) => ({ name, description, sha256 })); }
    load(name: string) { const skill = this.map.get(name); if (!skill)
        throw new AgentError('SKILL_NOT_FOUND', '找不到技能'); return structuredClone(skill); }
    async loadDirectory(root: string) {
        for (const entry of await readdir(root, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.isSymbolicLink())
                continue;
            const file = join(root, entry.name, 'SKILL.md');
            const stat = await lstat(file);
            if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 50000)
                throw new AgentError('SKILL_FILE', '技能入口必须是小于 50KB 的普通文件');
            this.add(parseSkill(await readFile(file, 'utf8')));
        }
    }
}
