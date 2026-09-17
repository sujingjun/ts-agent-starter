import { spawn } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import type { ToolDefinition } from '../core/types.js';
import { s } from '../core/schema.js';
import { AgentError } from '../core/errors.js';
export function sandboxTestTool(workspace: string, image = 'node:22-bookworm-slim'): ToolDefinition {
    return {
        name: 'run_tests', description: '在无网络、只读工作区的独立 Docker 容器中执行固定 node --test，不接受任意 Shell 命令。',
        inputSchema: s.object({}), outputSchema: s.object({ exitCode: s.number(), stdout: s.string(10000), stderr: s.string(10000) }), effect: 'external', idempotent: true, timeoutMs: 30000,
        async execute(_input, context) {
            const root = await realpath(workspace);
            if (root.includes(',') || root.includes('\n'))
                throw new AgentError('WORKSPACE_INVALID', '工作区路径不适用于容器挂载');
            return await new Promise((resolve, reject) => {
                const name = 'agent-test-' + context.idempotencyKey.slice(0, 24);
                const args = ['run', '--rm', '--name', name, '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--pids-limit', '64', '--memory', '256m', '--cpus', '1', '--user', '65534:65534', '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '--mount', `type=bind,src=${root},dst=/workspace,readonly`, '-w', '/workspace', image, 'node', '--test'];
                const child = spawn('docker', args, { shell: false, env: { PATH: process.env['PATH'] ?? '/usr/bin:/bin' }, stdio: ['ignore', 'pipe', 'pipe'] });
                let out = '', err = '';
                child.stdout.on('data', (b: Buffer) => { out = (out + b.toString()).slice(0, 10000); });
                child.stderr.on('data', (b: Buffer) => { err = (err + b.toString()).slice(0, 10000); });
                const abort = () => { child.kill('SIGTERM'); const cleanup = spawn('docker', ['rm', '-f', name], { stdio: 'ignore', shell: false }); cleanup.on('error', () => { }); };
                context.signal.addEventListener('abort', abort, { once: true });
                child.on('error', e => { context.signal.removeEventListener('abort', abort); reject(new AgentError('SANDBOX_UNAVAILABLE', e.message)); });
                child.on('close', code => { context.signal.removeEventListener('abort', abort); if (context.signal.aborted)
                    reject(new AgentError('CANCELLED', '沙箱执行取消'));
                else
                    resolve({ exitCode: code ?? -1, stdout: out, stderr: err }); });
            });
        },
    };
}
