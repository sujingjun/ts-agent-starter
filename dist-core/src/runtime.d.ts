import { AgentRunner, ToolRegistry, DemoModel, CompatibleChatModel, EvidenceIndex } from './core/index.js';
import type { RunStore } from './core/index.js';
import { NoteStore } from './features/notes.js';
/** 所有环境变量只在应用组合入口读取，核心逻辑不偷偷切换模型或依赖。 */
export declare function createRuntime(options?: {
    store?: RunStore;
    root?: string;
    enableExternal?: boolean;
}): Promise<{
    runner: AgentRunner;
    store: RunStore;
    registry: ToolRegistry;
    index: EvidenceIndex;
    model: DemoModel | CompatibleChatModel;
    notes: NoteStore;
}>;
