import type { ModelPort } from './types.js';
import type { SearchHit } from './rag.js';
export interface ResearchPort {
    search(tenant: string, query: string, limit: number): Promise<SearchHit[]>;
}
export declare function deepResearch(model: ModelPort, search: ResearchPort, tenant: string, topic: string, options?: {
    maxRounds?: number;
    signal?: AbortSignal;
}): Promise<{
    answer: string;
    evidence: SearchHit[];
    trace: {
        round: number;
        queries: string[];
        newEvidence: number;
        gaps: string[];
    }[];
    coverageConfirmed: boolean;
    citations: {
        valid: boolean;
        unknown: string[];
        cited: string[];
    };
}>;
