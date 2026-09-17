import type { ToolDefinition } from './types.js';
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
export declare function chunkDocument(document: EvidenceDocument, size?: number, overlap?: number): Chunk[];
/** 中文按汉字及二元字组检索；英文按词检索。不等同于专门的中文分词模型。 */
export declare function tokenize(text: string): string[];
export declare class EvidenceIndex {
    private readonly chunks;
    add(document: EvidenceDocument): void;
    get(tenantId: string, id: string): Chunk | undefined;
    search(tenantId: string, query: string, limit?: number): SearchHit[];
}
export declare function searchDocumentsTool(index: EvidenceIndex): ToolDefinition;
export declare function verifyCitations(answer: string, allowed: ReadonlySet<string>): {
    valid: boolean;
    unknown: string[];
    cited: string[];
};
export declare function cosine(a: number[], b: number[]): number;
export declare function reciprocalRankFusion(rankings: string[][], k?: number): {
    id: string;
    score: number;
}[];
