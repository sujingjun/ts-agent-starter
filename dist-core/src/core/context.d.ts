import type { Message, ToolDescription } from './types.js';
/** UTF-8 字节估算仅用于输入裁剪，不是厂商计费 Token 数。 */
export declare function estimateTokens(value: unknown): number;
export declare function validateMessageSequence(messages: Message[]): void;
export declare function buildContext(messages: Message[], tools: ToolDescription[], budget: number): Message[];
export interface Summary {
    goal: string;
    constraints: string[];
    facts: {
        text: string;
        source: string;
    }[];
    openQuestions: string[];
}
export declare function summaryMessage(summary: Summary): Message;
