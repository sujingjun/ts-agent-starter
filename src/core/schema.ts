import type { Json, JsonObject, JsonSchema } from './types.js';
import { AgentError } from './errors.js';
const KEYS = new Set(['type', 'description', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems']);
/** 教学用严格 JSON Schema 子集。不支持的关键字直接报错，而不是假装完整兼容。 */
export function checkSchema(schema: JsonSchema, depth = 0): void {
    if (depth > 20)
        throw new AgentError('SCHEMA_DEPTH', 'Schema 嵌套过深');
    for (const key of Object.keys(schema))
        if (!KEYS.has(key))
            throw new AgentError('SCHEMA_UNSUPPORTED', `不支持的 Schema 关键字: ${key}`);
    if (schema.type && !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(schema.type))
        throw new AgentError('SCHEMA_UNSUPPORTED', '未知 type');
    if (schema.type === 'object' && schema.additionalProperties !== false)
        throw new AgentError('SCHEMA_UNSAFE', '工具对象必须显式设置 additionalProperties:false');
    for (const key of schema.required ?? [])
        if (!schema.properties?.[key])
            throw new AgentError('SCHEMA_INVALID', `required 字段没有定义: ${key}`);
    for (const child of Object.values(schema.properties ?? {}))
        checkSchema(child, depth + 1);
    if (schema.items)
        checkSchema(schema.items, depth + 1);
}
export function validate(schema: JsonSchema, value: unknown, path = '$', depth = 0): asserts value is Json {
    const bad = (message: string): never => { throw new AgentError('SCHEMA_VALIDATION', `${path}: ${message}`); };
    if (depth > 40)
        bad('数据嵌套过深');
    if (schema.enum && !schema.enum.some(v => canonical(v) === canonical(value as Json)))
        bad('不在枚举范围');
    switch (schema.type) {
        case 'null':
            if (value !== null)
                bad('必须是 null');
            break;
        case 'boolean':
            if (typeof value !== 'boolean')
                bad('必须是布尔值');
            break;
        case 'number':
        case 'integer': {
            if (typeof value !== 'number' || !Number.isFinite(value))
                bad('必须是有限数值');
            const n = value as number;
            if (schema.type === 'integer' && !Number.isInteger(n))
                bad('必须是整数');
            if (schema.minimum !== undefined && n < schema.minimum)
                bad('小于最小值');
            if (schema.maximum !== undefined && n > schema.maximum)
                bad('大于最大值');
            break;
        }
        case 'string': {
            if (typeof value !== 'string')
                bad('必须是字符串');
            const length = [...value as string].length;
            if (schema.minLength !== undefined && length < schema.minLength)
                bad('字符串过短');
            if (schema.maxLength !== undefined && length > schema.maxLength)
                bad('字符串过长');
            break;
        }
        case 'array': {
            if (!Array.isArray(value))
                bad('必须是数组');
            const list = value as unknown[];
            if (schema.minItems !== undefined && list.length < schema.minItems)
                bad('元素不足');
            if (schema.maxItems !== undefined && list.length > schema.maxItems)
                bad('元素过多');
            if (schema.items)
                list.forEach((v, i) => validate(schema.items!, v, `${path}[${i}]`, depth + 1));
            break;
        }
        case 'object': {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                bad('必须是对象');
            const obj = value as Record<string, unknown>;
            if (Object.getPrototypeOf(obj) !== Object.prototype && Object.getPrototypeOf(obj) !== null)
                bad('必须是普通对象');
            for (const k of schema.required ?? [])
                if (!Object.hasOwn(obj, k))
                    bad(`缺少 ${k}`);
            for (const [k, v] of Object.entries(obj)) {
                if (['__proto__', 'prototype', 'constructor'].includes(k))
                    bad('禁止原型相关字段');
                const child = schema.properties?.[k];
                if (!child && schema.additionalProperties === false)
                    bad(`未知字段 ${k}`);
                if (child)
                    validate(child, v, `${path}.${k}`, depth + 1);
            }
            break;
        }
        default: assertJson(value, depth); // 明确的任意 JSON，不允许函数、undefined、NaN。
    }
    assertJson(value, depth);
}
export function assertJson(value: unknown, depth = 0): asserts value is Json {
    if (depth > 40)
        throw new AgentError('JSON_DEPTH', 'JSON 嵌套过深');
    if (value === null || typeof value === 'string' || typeof value === 'boolean')
        return;
    if (typeof value === 'number' && Number.isFinite(value))
        return;
    if (Array.isArray(value)) {
        value.forEach(v => assertJson(v, depth + 1));
        return;
    }
    if (value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
        for (const [k, v] of Object.entries(value)) {
            if (['__proto__', 'prototype', 'constructor'].includes(k))
                throw new AgentError('INVALID_JSON', '禁止原型字段');
            assertJson(v, depth + 1);
        }
        return;
    }
    throw new AgentError('INVALID_JSON', '仅接受有限、无环、可序列化 JSON 值');
}
export function objectInput(value: unknown): JsonObject {
    assertJson(value);
    if (value === null || Array.isArray(value) || typeof value !== 'object')
        throw new AgentError('INVALID_ARGUMENT', '工具参数必须是对象');
    return value;
}
export function canonical(value: Json): string {
    if (Array.isArray(value))
        return '[' + value.map(canonical).join(',') + ']';
    if (value !== null && typeof value === 'object')
        return '{' + Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k]!)}`).join(',') + '}';
    return JSON.stringify(value);
}
export const s = {
    string: (maxLength = 4000): JsonSchema => ({ type: 'string', maxLength }),
    number: (): JsonSchema => ({ type: 'number' }),
    object: (properties: Record<string, JsonSchema>, required = Object.keys(properties)): JsonSchema => ({ type: 'object', properties, required, additionalProperties: false }),
};
