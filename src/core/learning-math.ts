import { invariant } from './errors.js';
/** 小规模数值实验，仅用于理解机制，不是 Transformer 训练框架。 */
export function softmax(logits: number[]): number[] { invariant(logits.length && logits.every(Number.isFinite), 'LOGITS', 'logits 无效'); const max = Math.max(...logits); const values = logits.map(v => Math.exp(v - max)); const total = values.reduce((a, b) => a + b, 0); return values.map(v => v / total); }
export function attention(query: number[], keys: number[][], values: number[][]): {
    weights: number[];
    output: number[];
} {
    invariant(query.length && keys.length && keys.length === values.length && keys.every(k => k.length === query.length), 'ATTENTION_SHAPE', '注意力矩阵尺寸错误');
    const dim = values[0]!.length;
    invariant(dim && values.every(v => v.length === dim), 'ATTENTION_SHAPE', 'Value 维度不一致');
    const weights = softmax(keys.map(k => k.reduce((sum, x, i) => sum + x * query[i]!, 0) / Math.sqrt(query.length)));
    return { weights, output: Array.from({ length: dim }, (_, j) => values.reduce((sum, v, i) => sum + weights[i]! * v[j]!, 0)) };
}
export function groupAdvantages(rewards: number[]): number[] { invariant(rewards.length > 1 && rewards.every(Number.isFinite), 'REWARD_GROUP', '奖励组至少两项有限值'); const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length; const std = Math.sqrt(rewards.reduce((s, x) => s + (x - mean) ** 2, 0) / rewards.length); return rewards.map(r => (r - mean) / (std + 1e-8)); }
export function clippedPolicyObjective(ratio: number, advantage: number, epsilon = .2): number { return Math.min(ratio * advantage, Math.min(1 + epsilon, Math.max(1 - epsilon, ratio)) * advantage); }
/** 真实更新一个小型离散策略的参数，演示监督训练；不是对大语言模型进行 SFT。 */
export function trainCategoricalPolicy(target: number, classes = 3, iterations = 80, learningRate = .1) {
    invariant(Number.isInteger(target) && target >= 0 && target < classes, 'TARGET', '目标类别无效');
    const logits = Array<number>(classes).fill(0);
    const losses: number[] = [];
    for (let step = 0; step < iterations; step++) {
        const p = softmax(logits);
        losses.push(-Math.log(p[target]!));
        for (let i = 0; i < classes; i++)
            logits[i] = logits[i]! - learningRate * (p[i]! - (i === target ? 1 : 0));
    }
    return { logits, probabilities: softmax(logits), losses };
}
