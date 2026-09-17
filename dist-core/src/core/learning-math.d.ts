/** 小规模数值实验，仅用于理解机制，不是 Transformer 训练框架。 */
export declare function softmax(logits: number[]): number[];
export declare function attention(query: number[], keys: number[][], values: number[][]): {
    weights: number[];
    output: number[];
};
export declare function groupAdvantages(rewards: number[]): number[];
export declare function clippedPolicyObjective(ratio: number, advantage: number, epsilon?: number): number;
/** 真实更新一个小型离散策略的参数，演示监督训练；不是对大语言模型进行 SFT。 */
export declare function trainCategoricalPolicy(target: number, classes?: number, iterations?: number, learningRate?: number): {
    logits: number[];
    probabilities: number[];
    losses: number[];
};
