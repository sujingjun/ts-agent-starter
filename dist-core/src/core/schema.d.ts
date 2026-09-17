import type { Json, JsonObject, JsonSchema } from './types.js';
/** 教学用严格 JSON Schema 子集。不支持的关键字直接报错，而不是假装完整兼容。 */
export declare function checkSchema(schema: JsonSchema, depth?: number): void;
export declare function validate(schema: JsonSchema, value: unknown, path?: string, depth?: number): asserts value is Json;
export declare function assertJson(value: unknown, depth?: number): asserts value is Json;
export declare function objectInput(value: unknown): JsonObject;
export declare function canonical(value: Json): string;
export declare const s: {
    string: (maxLength?: number) => JsonSchema;
    number: () => JsonSchema;
    object: (properties: Record<string, JsonSchema>, required?: string[]) => JsonSchema;
};
