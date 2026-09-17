import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AgentRunner, ToolRegistry, MemoryRunStore, FileRunStore, DemoModel, CompatibleChatModel, EvidenceIndex, calculatorTool, searchDocumentsTool } from './core/index.js';
import { NoteStore, noteTools } from './features/notes.js';
import { fileTools } from './infra/file-tools.js';
import { tavilySearchTool } from './infra/search.js';
import { sandboxTestTool } from './infra/sandbox.js';
/** 所有环境变量只在应用组合入口读取，核心逻辑不偷偷切换模型或依赖。 */
export async function createRuntime(options = {}) {
    const root = options.root ?? process.cwd();
    const index = new EvidenceIndex();
    const documents = JSON.parse(await readFile(resolve(root, 'data/knowledge.json'), 'utf8'));
    for (const document of documents)
        index.add(document);
    const registry = new ToolRegistry().register(calculatorTool()).register(searchDocumentsTool(index));
    const notes = new NoteStore(resolve(root, '.data/notes'));
    for (const tool of noteTools(notes))
        registry.register(tool);
    const workspace = process.env['WORKSPACE_ROOT'];
    if (workspace)
        for (const tool of fileTools(resolve(workspace)))
            registry.register(tool);
    if (options.enableExternal && process.env['TAVILY_API_KEY'])
        registry.register(tavilySearchTool(process.env['TAVILY_API_KEY']));
    if (options.enableExternal && workspace && process.env['ENABLE_SANDBOX'] === 'true')
        registry.register(sandboxTestTool(resolve(workspace)));
    const mode = process.env['MODEL_MODE'] ?? 'demo';
    if (!['demo', 'live'].includes(mode))
        throw new Error('MODEL_MODE 只能是 demo 或 live');
    const model = mode === 'live' ? new CompatibleChatModel({
        baseUrl: process.env['LLM_BASE_URL'] ?? '', apiKey: process.env['LLM_API_KEY'] ?? '', model: process.env['LLM_MODEL'] ?? '',
        stream: process.env['LLM_STREAM'] === 'true', includeStreamUsage: process.env['LLM_STREAM_USAGE'] === 'true', allowLocalHttp: process.env['ALLOW_LOCAL_MODEL'] === 'true',
    }) : new DemoModel();
    const store = options.store ?? (process.env['STORE_MODE'] === 'file' ? new FileRunStore(resolve(root, '.data/runs')) : new MemoryRunStore());
    const runner = new AgentRunner({ model, registry, store });
    return { runner, store, registry, index, model, notes };
}
//# sourceMappingURL=runtime.js.map