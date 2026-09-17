import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
const client = new Client({ name: 'ts-agent-lab-client', version: '0.2.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(import.meta.resolve('tsx/cli')), fileURLToPath(new URL('./server.ts', import.meta.url))] });
try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.ok(tools.tools.some(t => t.name === 'calculator'));
    const result = await client.callTool({ name: 'calculator', arguments: { expression: '15+30+25' } });
    assert.match(JSON.stringify(result), /70/);
    assert.notEqual(result.isError, true);
    console.log('MCP stdio 握手、发现与调用断言通过');
}
finally {
    await client.close();
}
