import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
if(!process.env.API_AUTH_TOKEN)throw new Error('缺少本地 API_AUTH_TOKEN');
if(process.env.MODEL_MODE&&process.env.MODEL_MODE!=='demo')throw new Error('浏览器冒烟只允许 demo');
await mkdir('artifacts/browser',{recursive:true});
const browser=await chromium.launch({headless:true});const failures=[];const checks=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 page.on('pageerror',e=>failures.push(e.message));
 await page.goto(process.env.WEB_BASE??'http://127.0.0.1:3000',{waitUntil:'networkidle'});
 await page.locator('#access-token').fill(process.env.API_AUTH_TOKEN);
 await page.getByRole('button',{name:'连接服务',exact:true}).click();
 await page.waitForSelector('button.scenario');
 const status=page.getByTestId('run-status');const output=page.getByTestId('run-output');
 async function settled(text='已完成'){
  await page.waitForFunction(t=>document.querySelector('[data-testid="run-status"]')?.textContent?.trim()===t,text,{timeout:30000});
  assert.equal((await status.textContent())?.trim(),text);
 }
 async function submit(){
  const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/studio/runs')&&r.request().method()==='POST'),page.getByRole('button',{name:'开始执行',exact:true}).click()]);
  assert.equal(response.ok(),true);const run=await response.json();
  await page.waitForFunction(id=>[...document.querySelectorAll('.notice-row code')].some(el=>el.textContent===id),run.id);
 }
 async function choose(title){await page.locator('aside button.scenario').filter({hasText:title}).first().click();await submit();}
 await choose('工具调用');await settled();assert.match(await output.innerText(),/20/);checks.push('calculator');
 await page.getByRole('checkbox').check();await page.getByRole('textbox',{name:'任务问题'}).fill('我刚才问了什么');await submit();await settled();assert.match(await output.innerText(),/\(2\+3\)\*4/);checks.push('continued-thread');
 await choose('证据检索');await settled();assert.match(await output.innerText(),/hits/);checks.push('evidence-retrieval');
 await choose('写入审批');await settled('等待审批');await page.getByRole('button',{name:'拒绝所列操作'}).click();await settled();checks.push('approval-reject');
 await choose('写入审批');await settled('等待审批');await page.getByRole('button',{name:'批准所列操作'}).click();await settled();
 await choose('长期笔记');await settled();assert.match(await output.innerText(),/TypeScript/);checks.push('approved-memory');
 await choose('研究工作流');await settled('等待审批');await page.getByRole('button',{name:'批准所列操作'}).click();await settled();assert.match(await output.innerText(),/exported/);checks.push('research-approval');
 await page.getByRole('button',{name:'查看检查点历史'}).click();await page.waitForFunction(()=>document.body.innerText.includes('checkpointId'));checks.push('checkpoint-history');
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'下载已批准报告'}).click()]);assert.equal(download.suggestedFilename(),'research-report.json');await download.saveAs('artifacts/browser/research-report.json');checks.push('artifact-download');
 await choose('证据不足分支');await settled();assert.match(await output.innerText(),/no_evidence/);checks.push('no-evidence-branch');
 await choose('技能加载');await settled();assert.match(await output.innerText(),/hits/);checks.push('skill-selection');
 await choose('多轮与上下文');await settled();checks.push('context-entry');
 await page.locator('#access-token').fill('');
 await page.screenshot({path:'artifacts/browser/studio.png',fullPage:true});
 await page.getByRole('link',{name:'原生核心对照台 →'}).click();await page.waitForSelector('#question');checks.push('native-comparison-page');
 assert.equal(failures.length,0,failures.join('\n'));
 await writeFile('artifacts/browser/result.json',JSON.stringify({passed:true,model:'demo-not-LLM',checks,pageErrors:failures},null,2));
 console.log('Nuxt 浏览器流程通过：'+checks.join(', '));
} finally {await browser.close();}
