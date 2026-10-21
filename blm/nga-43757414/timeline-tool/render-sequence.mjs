// Usage: node render-sequence.mjs input.json output.png [--flow]
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const [inputPath,outputPath,mode]=process.argv.slice(2);
if(!inputPath||!outputPath){console.error('用法：node render-sequence.mjs 序列.json 输出.png');process.exit(1)}
const input=JSON.parse(await fs.readFile(path.resolve(inputPath),'utf8'));
const runtime=process.env.BLM_PLAYWRIGHT_PATH||path.join(process.env.USERPROFILE||'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const {chromium}=await import(existsSync(runtime)?pathToFileURL(runtime).href:'playwright');
const port=Number(process.env.BLM_TIMELINE_PORT||8766);
const url=`http://127.0.0.1:${port}`;
async function healthy(){try{const r=await fetch(url+'/__local_health');return r.ok&&(await r.json()).application==='blm-timeline-local'}catch{return false}}
let service,browser;
try{
  if(!await healthy()){
    service=spawn(process.execPath,[path.join(root,'serve.mjs')],{cwd:root,windowsHide:true,stdio:'ignore'});
    for(let i=0;i<40&&!await healthy();i++)await new Promise(resolve=>setTimeout(resolve,100));
    if(!await healthy())throw new Error(`无法在${port}端口启动本地工具`);
  }
  const executable=process.env.BLM_BROWSER_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.addInitScript(()=>{localStorage.setItem('DT.language','zh');localStorage.setItem('DT.colorTheme','Light')});
  const dialogs=[];
  page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.dismiss()});
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.blmTimeline&&document.querySelector('[aria-label="技能序列"]'));
  const result=await page.evaluate(async data=>{
    const summary=window.blmTimeline.importSequence(data);
    const png=data.__flow?await window.blmTimeline.exportFlow(data.flow):await window.blmTimeline.exportPng(data.export);
    return {summary,png};
  },{...input,__flow:mode==='--flow'});
  if(dialogs.length)throw new Error('模拟器报错：'+dialogs.join('\n'));
  const output=path.resolve(outputPath);
  await fs.mkdir(path.dirname(output),{recursive:true});
  await fs.writeFile(output,Buffer.from(result.png.dataUrl.split(',')[1],'base64'));
  await fs.writeFile(output.replace(/\.png$/i,'')+'.record.json',JSON.stringify(result.summary.record,null,2));
  await fs.writeFile(output.replace(/\.png$/i,'')+'.timings.json',JSON.stringify({...result.summary,record:undefined,width:result.png.width,height:result.png.height,...(result.png.steps?{flowSteps:result.png.steps,gcdCount:result.png.gcdCount}:{})},null,2));
  console.log(JSON.stringify({output,actions:result.summary.actions.length,gcdCount:result.png.gcdCount,duration:result.summary.duration,width:result.png.width,height:result.png.height,patch:result.summary.patch}));
}finally{if(browser)await browser.close();if(service)service.kill()}
