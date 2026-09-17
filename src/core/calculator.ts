import { AgentError } from './errors.js';
import { s } from './schema.js';
import type { ToolDefinition } from './types.js';
/** 递归下降算术解析；没有 eval、new Function 或执行模型生成代码。 */
export function calculate(expression: string): number {
    if (expression.length > 1000)
        throw new AgentError('EXPRESSION_LIMIT', '表达式过长');
    const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/%]/g) ?? [];
    if (tokens.join('') !== expression.replace(/\s/g, ''))
        throw new AgentError('EXPRESSION_TOKEN', '表达式含非法字符');
    let p = 0, depth = 0;
    const atom = (): number => {
        if (++depth > 50)
            throw new AgentError('EXPRESSION_DEPTH', '表达式嵌套过深');
        let value: number;
        const token = tokens[p++];
        if (token === '+')
            value = atom();
        else if (token === '-')
            value = -atom();
        else if (token === '(') {
            value = sum();
            if (tokens[p++] !== ')')
                throw new AgentError('EXPRESSION_PAREN', '括号不匹配');
        }
        else {
            if (!token || !/^\d|^\.\d/.test(token))
                throw new AgentError('EXPRESSION_VALUE', '缺少数值');
            value = Number(token);
        }
        depth--;
        return value;
    };
    const product = (): number => { let v = atom(); while (['*', '/', '%'].includes(tokens[p] ?? '')) {
        const op = tokens[p++]!;
        const n = atom();
        if ((op === '/' || op === '%') && n === 0)
            throw new AgentError('DIVISION_ZERO', '不能除以零');
        v = op === '*' ? v * n : op === '/' ? v / n : v % n;
    } return v; };
    const sum = (): number => { let v = product(); while (tokens[p] === '+' || tokens[p] === '-') {
        const op = tokens[p++];
        const n = product();
        v = op === '+' ? v + n : v - n;
    } return v; };
    const answer = sum();
    if (p !== tokens.length || !Number.isFinite(answer))
        throw new AgentError('EXPRESSION_INVALID', '表达式不完整或结果超出范围');
    return answer;
}
export function calculatorTool(): ToolDefinition {
    return {
        name: 'calculator', description: '执行有限精度的加减乘除、取余和括号算术；不接受脚本。',
        inputSchema: s.object({ expression: s.string(1000) }), outputSchema: s.object({ value: s.number() }), effect: 'read', idempotent: true, timeoutMs: 1000,
        async execute(input) { return { value: calculate(input['expression'] as string) }; },
    };
}
