import type { ToolDefinition } from './types.js';
/** 递归下降算术解析；没有 eval、new Function 或执行模型生成代码。 */
export declare function calculate(expression: string): number;
export declare function calculatorTool(): ToolDefinition;
