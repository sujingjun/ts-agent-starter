import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { calculate, EvidenceIndex } from '../../dist-core/src/core/index.js';
const index = new EvidenceIndex();
for (const d of JSON.parse(await readFile(new URL('../../data/knowledge.json', import.meta.url), 'utf8')))
    index.add(d);
const server = new McpServer({ name: 'ts-agent-learning-tools', version: '0.2.0' });
server.registerTool('calculator', { description: '安全算术，不执行脚本', inputSchema: z.object({ expression: z.string().max(1000) }) }, async ({ expression }) => ({ content: [{ type: 'text', text: JSON.stringify({ value: calculate(expression) }) }] }));
server.registerTool('search_documents', { description: '读取固定 local 教学资料，不接受调用方指定租户', inputSchema: z.object({ query: z.string().max(2000) }) }, async ({ query }) => ({ content: [{ type: 'text', text: JSON.stringify({ hits: index.search('local', query) }) }] }));
// SDK v2 默认传输兼容行为以安装版本为准；不手工冒充新协议握手。
await server.connect(new StdioServerTransport());
process.on('SIGINT', () => { void server.close(); });
