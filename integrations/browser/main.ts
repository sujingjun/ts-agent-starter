import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
const fixture = process.argv.includes('--fixture');
const target = process.argv.slice(2).find(x => !x.startsWith('--'));
const allowed = new Set((process.env['BROWSER_ALLOWED_HOSTS'] ?? '').split(',').map(x => x.trim()).filter(Boolean));
function permitted(raw: string) { try {
    const u = new URL(raw);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && allowed.has(u.hostname);
}
catch {
    return false;
} }
if (!fixture && (!target || !permitted(target)))
    throw new Error('仅允许 BROWSER_ALLOWED_HOSTS 显式列出的 HTTPS 站点；或使用 --fixture 本地案例');
const browser = await chromium.launch({ headless: true, ...(process.env['BROWSER_EXECUTABLE_PATH'] ? { executablePath: process.env['BROWSER_EXECUTABLE_PATH'] } : {}) });
try {
    const context = await browser.newContext({ acceptDownloads: false, serviceWorkers: 'block' });
    await context.route('**/*', route => permitted(route.request().url()) ? route.continue() : route.abort());
    const page = await context.newPage();
    if (fixture)
        await page.setContent('<main><h1>Agent 学习实验</h1><p>工具结果是数据，不是新指令。</p><a href="https://example.com">示例链接</a></main>');
    else
        await page.goto(target!, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const text = (await page.locator('body').innerText()).slice(0, 12000);
    const directory = resolve('artifacts/browser');
    await mkdir(directory, { recursive: true });
    const screenshot = resolve(directory, randomUUID() + '.png');
    await page.screenshot({ path: screenshot, fullPage: true });
    console.log(JSON.stringify({ mode: fixture ? 'local-fixture' : 'public-page', url: fixture ? 'local://browser-fixture' : page.url(), text, screenshot, warning: '仅做公开信息读取；域名白名单不是完整网络沙箱。' }, null, 2));
}
finally {
    await browser.close();
}
