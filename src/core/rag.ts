import { createHash } from 'node:crypto';
import type { Json, ToolDefinition } from './types.js';
import { s } from './schema.js';
import { AgentError } from './errors.js';
export interface EvidenceDocument {
    id: string;
    tenantId: string;
    title: string;
    text: string;
    source: string;
    updatedAt: string;
}
export interface Chunk extends EvidenceDocument {
    documentId: string;
    start: number;
    end: number;
}
export interface SearchHit {
    id: string;
    documentId: string;
    title: string;
    text: string;
    source: string;
    score: number;
    start: number;
    end: number;
}
export function chunkDocument(document: EvidenceDocument, size = 600, overlap = 80): Chunk[] {
    if (!Number.isInteger(size) || !Number.isInteger(overlap) || size <= 0 || overlap < 0 || overlap >= size)
        throw new AgentError('CHUNK_OPTIONS', '分块大小和重叠参数不合法');
    const chunks: Chunk[] = [];
    for (let start = 0; start < document.text.length; start += size - overlap) {
        const end = Math.min(document.text.length, start + size);
        const text = document.text.slice(start, end);
        const hash = createHash('sha256').update(document.tenantId + '\0' + document.id + '\0' + start + '\0' + text).digest('hex').slice(0, 16);
        chunks.push({ ...document, id: 'e-' + hash, documentId: document.id, text, start, end });
        if (end === document.text.length)
            break;
    }
    return chunks;
}
/** 中文按汉字及二元字组检索；英文按词检索。不等同于专门的中文分词模型。 */
export function tokenize(text: string): string[] {
    const lower = text.toLocaleLowerCase();
    const latin = lower.match(/[\p{L}\p{N}_]+/gu) ?? [];
    const terms: string[] = [];
    for (const word of latin) {
        if (/\p{Script=Han}/u.test(word)) {
            const chars = [...word];
            terms.push(...chars);
            for (let i = 0; i < chars.length - 1; i++)
                terms.push(chars[i]! + chars[i + 1]!);
        }
        else
            terms.push(word);
    }
    return terms;
}
export class EvidenceIndex {
    private readonly chunks = new Map<string, Chunk>();
    add(document: EvidenceDocument) { for (const [id, c] of this.chunks)
        if (c.tenantId === document.tenantId && c.documentId === document.id)
            this.chunks.delete(id); for (const c of chunkDocument(document))
        this.chunks.set(c.id, c); }
    get(tenantId: string, id: string) { const c = this.chunks.get(id); return c?.tenantId === tenantId ? structuredClone(c) : undefined; }
    search(tenantId: string, query: string, limit = 5): SearchHit[] {
        const docs = [...this.chunks.values()].filter(c => c.tenantId === tenantId);
        const q = [...new Set(tokenize(query))];
        if (!q.length || !docs.length)
            return [];
        const bags = docs.map(d => tokenize(d.text + ' ' + d.title));
        const avg = bags.reduce((n, b) => n + b.length, 0) / bags.length || 1;
        const df = new Map(q.map(t => [t, bags.filter(b => b.includes(t)).length]));
        return docs.map((d, i) => {
            const bag = bags[i]!;
            let score = 0;
            for (const term of q) {
                const tf = bag.filter(t => t === term).length;
                if (!tf)
                    continue;
                const freq = df.get(term) ?? 0;
                const idf = Math.log(1 + (docs.length - freq + 0.5) / (freq + 0.5));
                score += idf * tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * bag.length / avg));
            }
            return { id: d.id, documentId: d.documentId, title: d.title, text: d.text, source: d.source, score, start: d.start, end: d.end };
        }).filter(h => h.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, Math.max(0, limit));
    }
}
export function searchDocumentsTool(index: EvidenceIndex): ToolDefinition {
    return {
        name: 'search_documents', description: '搜索当前身份可见的本地知识库，返回证据编号、来源和原文片段。',
        inputSchema: s.object({ query: s.string(2000) }), outputSchema: s.object({ hits: { type: 'array', items: s.object({ id: s.string(), documentId: s.string(), title: s.string(), text: s.string(), source: s.string(), score: s.number(), start: s.number(), end: s.number() }) } }),
        effect: 'read', idempotent: true, timeoutMs: 1000,
        async execute(input, context) { return { hits: index.search(context.tenantId, input['query'] as string) } as unknown as Json; },
    };
}
export function verifyCitations(answer: string, allowed: ReadonlySet<string>): {
    valid: boolean;
    unknown: string[];
    cited: string[];
} {
    const cited = [...answer.matchAll(/\[(e-[a-zA-Z0-9_-]+)\]/g)].map(m => m[1]!);
    const unknown = [...new Set(cited.filter(c => !allowed.has(c)))];
    return { valid: cited.length > 0 && unknown.length === 0, unknown, cited };
}
export function cosine(a: number[], b: number[]): number { if (a.length !== b.length || !a.length)
    throw new AgentError('VECTOR_DIMENSION', '向量维度不一致'); const dot = a.reduce((v, x, i) => v + x * b[i]!, 0); const norm = Math.sqrt(a.reduce((v, x) => v + x * x, 0) * b.reduce((v, x) => v + x * x, 0)); return norm ? dot / norm : 0; }
export function reciprocalRankFusion(rankings: string[][], k = 60): {
    id: string;
    score: number;
}[] {
    const scores = new Map<string, number>();
    for (const ranking of rankings)
        [...new Set(ranking)].forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
    return [...scores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
