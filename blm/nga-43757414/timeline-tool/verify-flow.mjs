import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const modulePath=process.env.BLM_PLAYWRIGHT_PATH||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const executable=process.env.BLM_BROWSER_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:executable,headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});
  const errors=[],dialogs=[],external=[],failures=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.dismiss()});
  page.on('response',r=>{if(r.status()>=400)failures.push(r.url()+': '+r.status())});
  await page.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith('http://127.0.0.1:8766')||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();
    external.push(url);return route.abort();
  });
  await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'加载基准示例'}).click();
  assert.match(await page.getByRole('status').innerText(),/15个动作/);
  const baseline=await page.evaluate(()=>window.blmTimeline.summarize());
  assert.equal(baseline.actions.length,15);
  assert.equal(baseline.actions.filter(a=>a.name==='Fire 4').length,6);
  assert.ok(baseline.actions.every(a=>a.invalid.length===0));
  const checks=await page.evaluate(()=>{
    const before=JSON.stringify(window.blmTimeline.summarize().record);
    const rejected=[];
    for(const input of [{actions:['火4']},{actions:['冰针']},{initialResources:{UMBRAL_HEART:4},actions:['冰4']}]){
      try{window.blmTimeline.importSequence(input);rejected.push('accepted-invalid')}catch(e){rejected.push(e.message)}
      if(JSON.stringify(window.blmTimeline.summarize().record)!==before)throw new Error('Invalid input changed current timeline');
    }
    window.blmTimeline.importSequence(window.blmTimeline.summarize().record);
    const after=window.blmTimeline.summarize();
    return {rejected,roundtrip:after.actions.length,valid:after.actions.every(a=>a.invalid.length===0)};
  });
  assert.equal(checks.roundtrip,15);assert.equal(checks.valid,true);assert.ok(checks.rejected.every(e=>e!=='accepted-invalid'));
  await page.locator('.skillButton[title="Xenoglossy"]').click();
  const manual=await page.evaluate(()=>window.blmTimeline.summarize());
  assert.equal(manual.actions.length,16);assert.equal(manual.actions.at(-1).name,'Xenoglossy');
  await page.getByRole('button',{name:'加载基准示例'}).click();
  const flow=await page.evaluate(async()=>{
    const before=JSON.stringify(window.blmTimeline.summarize().record);
    const exported=await window.blmTimeline.exportFlow({expectedGcd:13});
    if(JSON.stringify(window.blmTimeline.summarize().record)!==before)throw new Error('Flow export changed current timeline');
    return {width:exported.width,height:exported.height,gcdCount:exported.gcdCount,steps:exported.steps};
  });
  assert.equal(flow.gcdCount,13);assert.equal(flow.steps.length,15);
  assert.deepEqual(flow.steps.filter(s=>s.key==='PARADOX').map(s=>s.phase),['UI3','AF3']);
  const flowDownloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'导出释放顺序流程图',exact:true}).click();
  const flowDownload=await flowDownloadPromise;
  const flowPng=await fs.readFile(await flowDownload.path());
  assert.equal(flowPng.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(flowPng.readUInt32BE(16),2208);assert.equal(flowPng.readUInt32BE(20),908);
  const wait=page.waitForEvent('download');
  await page.getByRole('button',{name:'导出完整时间轴 PNG',exact:true}).click();
  const download=await wait;
  assert.match(download.suggestedFilename(),/\.png$/);
  const file=await download.path();const png=await fs.readFile(file);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  assert.equal(width,2400);assert.equal(height,621);
  await page.screenshot({path:path.join(process.env.TEMP,'blm-timeline-local-screen.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);assert.deepEqual(failures,[]);assert.deepEqual(external,[]);
  console.log(JSON.stringify({baselineActions:15,manualAppend:16,png:{width,height},flow:{gcdCount:flow.gcdCount,actions:flow.steps.length,width:flowPng.readUInt32BE(16),height:flowPng.readUInt32BE(20)},checks,externalRequests:external,pageErrors:errors}));
}finally{await browser.close()}
