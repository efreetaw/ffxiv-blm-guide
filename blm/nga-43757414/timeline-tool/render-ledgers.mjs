// Generate the five guide reference models with the local replay engine and flow exporter.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const config={spellSpeed:420,skillSpeed:420,countdown:0,fps:60,animationLock:0.7,randomSeed:'ledger',procMode:'Never'};
const standard=['即刻','冰3','冰4','U','星灵移位','火3','火4×6','A','耀星','绝望'];
const models=[
  {id:'standard',name:'单体基准循环',gcd:13,potency:6846,initialResources:{MANA:10000,UMBRAL_ICE:1,PARADOX:1,FIRESTARTER:1},actions:standard,subtitle:'初始：UI1、满蓝、冰悖论、火苗；含即刻和移位'},
  {id:'opener',name:'起手循环',gcd:14,potency:8100,initialResources:{MANA:10000,ASTRAL_FIRE:3,UMBRAL_HEART:3},actions:['火4×4','绝望','魔泉','火4×6','A','耀星','绝望'],subtitle:'从AF3开始计量：满蓝、3根冰针；魔泉不占技能位'},
  {id:'two-stage',name:'火段组合循环',gcd:22,potency:12156,initialResources:{MANA:10000,ASTRAL_FIRE:3,UMBRAL_HEART:3,PARADOX:1},actions:['火4×6','A','耀星','绝望','星灵移位',...standard],subtitle:'前段常规火段9GCD ＋ 后段单体基准13GCD；每行从左到右'},
  {id:'aoe-two',name:'双目标AOE基准',gcd:5,potency:3360.6,initialResources:{MANA:10000,UMBRAL_ICE:1,PARADOX:1},actions:['冰4','U','星灵移位',...['Flare','Flare','Flare Star'].map(skillName=>({type:'Skill',skillName,targetList:[1,2]}))],subtitle:'2目标：冰4、冰悖论为单体；核爆与耀星攻击双目标'},
  {id:'aoe-three',name:'三目标AOE基准',gcd:5,potency:4273.2,initialResources:{MANA:10000,UMBRAL_ICE:1,PARADOX:1},actions:[{type:'Skill',skillName:'Freeze',targetList:[1,2,3]},'U','星灵移位',...['Flare','Flare','Flare Star'].map(skillName=>({type:'Skill',skillName,targetList:[1,2,3]}))],subtitle:'3目标：玄冰、核爆与耀星为群攻；冰悖论仍为单体'},
];
const folder=path.join(root,'examples','ledgers');
await fs.mkdir(folder,{recursive:true});
const results=[];
for(const model of models){
  const input={name:model.name,config,initialResources:model.initialResources,actions:model.actions,flow:{columns:8,pixelRatio:2,expectedGcd:model.gcd,title:`${model.name}｜${model.gcd}技能位／${model.potency}威力`,subtitle:model.subtitle}};
  const file=path.join(folder,model.id+'.json');
  await fs.writeFile(file,JSON.stringify(input,null,2));
  const output=path.join(root,'..','images','ledger-'+model.id+'.png');
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(root,'render-sequence.mjs'),file,output,'--flow'],{windowsHide:true,stdio:'inherit'});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Failed ${model.id}: exit ${code}`)));
  });
  const timing=JSON.parse(await fs.readFile(output.replace(/\.png$/,'')+'.timings.json','utf8'));
  const actual=timing.actions.map(a=>a.name);
  if(timing.gcdCount!==model.gcd||timing.actions.some(a=>a.invalid.length))throw new Error('Invalid ledger sequence '+model.id);
  // Preserve simulator-derived provenance beside the reusable input, while the document images folder only holds PNGs.
  for(const suffix of ['.record.json','.timings.json'])await fs.rename(output.replace(/\.png$/,'')+suffix,path.join(folder,model.id+suffix));
  results.push({id:model.id,guidePotency:model.potency,expectedGcd:model.gcd,actualGcd:timing.gcdCount,actionCount:actual.length,actions:actual,phases:timing.flowSteps.map(s=>s.phase),image:path.basename(output),simulatorPatch:timing.patch});
}
await fs.writeFile(path.join(folder,'verification.json'),JSON.stringify(results,null,2));
console.log('Verified all five reference-model flow diagrams.');
