import { AgentError } from './errors.js';
import { checkSchema } from './schema.js';
export class ToolRegistry {
    tools = new Map();
    register(tool) {
        if (!/^[a-z][a-z0-9_]{0,63}$/.test(tool.name))
            throw new AgentError('TOOL_NAME', '工具名不合法');
        if (this.tools.has(tool.name))
            throw new AgentError('DUPLICATE_TOOL', `重复工具: ${tool.name}`);
        if (!Number.isFinite(tool.timeoutMs) || tool.timeoutMs <= 0)
            throw new AgentError('TOOL_TIMEOUT', '工具超时必须大于 0');
        checkSchema(tool.inputSchema);
        checkSchema(tool.outputSchema);
        this.tools.set(tool.name, tool);
        return this;
    }
    get(name) { return this.tools.get(name); }
    describe() { return [...this.tools.values()].map(({ name, description, inputSchema }) => ({ name, description, inputSchema })); }
}
export class DefaultPolicy {
    denied;
    constructor(denied = []) { this.denied = new Set(denied); }
    decide(tool, _state) {
        if (this.denied.has(tool.name) || tool.effect === 'destructive')
            return 'deny';
        return tool.effect === 'read' ? 'allow' : 'approve';
    }
}
//# sourceMappingURL=tools.js.map