import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.WEB_BASE??'http://127.0.0.1:3000';
if(!process.env.API_AUTH_TOKEN)throw new Error('缺少 API_AUTH_TOKEN；先启动 API 与网页');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.locator('#access-token').fill(process.env.API_AUTH_TOKEN);
  await page.getByRole('button',{name:'连接服务',exact:true}).click();
  await page.getByRole('textbox',{name:'任务问题',exact:true}).fill('计算 (2+3)*4');
  await page.getByRole('button',{name:'开始执行',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="run-status"]')?.textContent?.includes('已完成'));
  assert.match(await page.getByTestId('run-output').innerText(),/20/);
  assert.deepEqual(errors,[]);console.log('通过：Nuxt 页面加载、认证连接、创建任务、事件流、最终结果。');
}finally{await browser.close();}
