// Generate the five guide reference models with the local replay engine and flow exporter.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const folder=path.join(root,'examples','ledgers');
for(const id of ['standard','opener','two-stage','aoe-two','aoe-three']){
  const file=path.join(folder,id+'.json');
  const output=path.join(root,'..','images','ledger-'+id+'.png');
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(root,'render-sequence.mjs'),file,output,'--flow'],{windowsHide:true,stdio:'inherit'});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Failed ${id}: exit ${code}`)));
  });
}
console.log('Generated all five reference-model flow diagrams.');
