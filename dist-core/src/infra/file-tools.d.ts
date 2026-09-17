import type { ToolDefinition } from '../core/types.js';
export declare function safePath(root: string, path: string): Promise<string>;
export declare function fileTools(root: string): ToolDefinition[];
